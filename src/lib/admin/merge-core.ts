/**
 * Merge core — the real logic behind the admin "merge duplicate logins" tool.
 *
 * Deliberately framework-free: no "use server", no next/cache, no next/headers.
 * `src/lib/admin/merge-actions.ts` wraps these with requireAdmin() +
 * revalidatePath(), and `scripts/verify/entity-merge-check.ts` calls them
 * directly against staging — so the harness exercises the SAME code the admin
 * UI runs, not a copy of it.
 *
 * The shape of the problem:
 *   - A login (auth.users) owns N investor_entities. Positions hang off the
 *     ENTITY, so a merge is really "re-point these entities at another login".
 *   - `investor_entities_one_primary_idx` is a partial unique index over
 *     (owner_user_id) where is_primary — moving a second primary in THROWS.
 *     Absorbed primaries must be demoted BEFORE the owner flip.
 *   - Five tables carry entity_id AND a denormalized user_id. Both must move.
 *   - There is no cross-statement transaction in supabase-js, so every step is
 *     ordered so a crash mid-way leaves a re-runnable state, never a lost row.
 *   - The absorbed auth user is BANNED, never deleted:
 *     participations.user_id is ON DELETE RESTRICT, so deleting a login with
 *     positions fails outright — and a delete would risk taking rows with it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Any Supabase client with enough privilege to read/write the admin tables. */
export type Db = SupabaseClient;

/** ~100 years. Supabase has no "ban forever", so we ban for longer than us. */
export const BAN_DURATION = "876000h";

/** The five tables carrying entity_id alongside a denormalized user_id. */
export const ENTITY_SCOPED_TABLES = [
  "participations",
  "note_registrations",
  "beneficiaries",
  "documents",
  "note_visibility",
] as const;

export type MergePreview = {
  survivor: {
    id: string;
    name: string | null;
    email: string | null;
    entityCount: number;
  };
  absorbed: Array<{
    id: string;
    name: string | null;
    email: string | null;
    entities: Array<{
      id: string;
      display_name: string;
      /** After collision-renaming. Equal to display_name when no collision. */
      newDisplayName: string;
      /**
       * The entity's OWN contact email — the address it actually corresponded
       * under. It is a column on the entity row, so it travels with the row and
       * is UNCHANGED by the merge: the entity keeps this address even though
       * the login it belonged to is about to be banned. Shown in the preview so
       * the admin can confirm the correspondence address survives.
       */
      email: string | null;
      is_primary: boolean;
      /** True when currently primary — it will be demoted before it moves. */
      willDemote: boolean;
      positions: number;
      invested: number;
    }>;
    referralCodes: number;
  }>;
  totals: { entities: number; positions: number; invested: number };
  warnings: string[];
};

export type MergeSummary = {
  survivorId: string;
  absorbedIds: string[];
  entitiesMoved: number;
  positionsMoved: number;
  investedMoved: number;
  demoted: number;
  renamed: Array<{ from: string; to: string }>;
  /** Rows whose denormalized user_id was re-pointed, per table. */
  rowsRepointed: Record<string, number>;
  /** note_visibility rows dropped because the survivor already had that note. */
  visibilityDuplicatesDropped: number;
  referralCodesMoved: number;
  referralCodesLeftBehind: number;
  referralsMoved: number;
  bannedUserIds: string[];
  warnings: string[];
};

export type MergeResult = { error?: string; summary?: MergeSummary };

type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
};

type EntityRow = {
  id: string;
  owner_user_id: string;
  display_name: string;
  business_name: string | null;
  email: string | null;
  is_primary: boolean;
};

function fullName(p: ProfileRow): string | null {
  const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`
    .replace(/\s+/g, " ")
    .trim();
  return name || null;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Pick a display_name for an incoming entity that does not collide with one the
 * survivor already owns.
 *
 * Both logins almost always have an entity called "Personal" — leaving two
 * "Personal"s on the survivor makes the lender's entity switcher useless. Prefer
 * the entity's business_name (the most meaningful disambiguator), fall back to
 * qualifying with the absorbed login's email, then to a numeric suffix.
 */
function resolveDisplayName(
  entity: EntityRow,
  absorbedEmail: string | null,
  taken: Set<string>,
): string {
  const original = entity.display_name;
  if (!taken.has(norm(original))) return original;

  const candidates: string[] = [];
  const business = (entity.business_name ?? "").trim();
  if (business && norm(business) !== norm(original)) candidates.push(business);
  if (absorbedEmail) candidates.push(`${original} (${absorbedEmail})`);
  for (let i = 2; i <= 20; i++) candidates.push(`${original} (${i})`);

  for (const c of candidates) {
    if (!taken.has(norm(c))) return c;
  }
  // Pathological: fall back to something guaranteed unique.
  return `${original} (${entity.id.slice(0, 8)})`;
}

async function loadProfiles(db: Db, ids: string[]): Promise<ProfileRow[]> {
  const { data, error } = await db
    .from("profiles")
    .select("id, email, first_name, last_name")
    .in("id", ids);
  if (error) throw new Error(`profiles lookup: ${error.message}`);
  return (data ?? []) as ProfileRow[];
}

async function loadEntities(db: Db, ownerIds: string[]): Promise<EntityRow[]> {
  const { data, error } = await db
    .from("investor_entities")
    .select("id, owner_user_id, display_name, business_name, email, is_primary")
    .in("owner_user_id", ownerIds);
  if (error) throw new Error(`entity lookup: ${error.message}`);
  return (data ?? []) as EntityRow[];
}

/** positions + invested per entity_id, for the given entities. */
async function loadPositionStats(
  db: Db,
  entityIds: string[],
): Promise<Map<string, { positions: number; invested: number }>> {
  const stats = new Map<string, { positions: number; invested: number }>();
  if (entityIds.length === 0) return stats;
  const { data, error } = await db
    .from("participations")
    .select("entity_id, invested_amount")
    .in("entity_id", entityIds);
  if (error) throw new Error(`participation lookup: ${error.message}`);
  for (const row of (data ?? []) as Array<{
    entity_id: string | null;
    invested_amount: string | number | null;
  }>) {
    if (!row.entity_id) continue;
    const cur = stats.get(row.entity_id) ?? { positions: 0, invested: 0 };
    cur.positions += 1;
    cur.invested += Number(row.invested_amount ?? 0);
    stats.set(row.entity_id, cur);
  }
  return stats;
}

async function countReferralCodes(db: Db, userId: string): Promise<number> {
  const { count, error } = await db
    .from("referral_codes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(`referral_codes count: ${error.message}`);
  return count ?? 0;
}

/**
 * READ ONLY. Derive exactly what a merge would change. Writes nothing.
 *
 * mergeLoginsCore re-derives this server-side before it writes, so the client's
 * copy is never trusted — the preview is a display, not an instruction.
 */
export async function buildMergePreview(
  db: Db,
  survivorId: string,
  absorbedIds: string[],
): Promise<MergePreview> {
  const ids = [survivorId, ...absorbedIds];
  const profiles = await loadProfiles(db, ids);
  const byId = new Map(profiles.map((p) => [p.id, p]));

  const survivorProfile = byId.get(survivorId);
  if (!survivorProfile) throw new Error(`no profile for survivor ${survivorId}`);
  for (const id of absorbedIds) {
    if (!byId.get(id)) throw new Error(`no profile for absorbed login ${id}`);
  }

  const entities = await loadEntities(db, ids);
  const stats = await loadPositionStats(
    db,
    entities.map((e) => e.id),
  );

  const survivorEntities = entities.filter(
    (e) => e.owner_user_id === survivorId,
  );

  // Names the survivor will hold. Seeded with what they already own, then grown
  // as each incoming entity claims a name — so two absorbed "Personal"s can't
  // both rename to the same thing.
  const taken = new Set(survivorEntities.map((e) => norm(e.display_name)));

  const warnings: string[] = [];
  const survivorName = fullName(survivorProfile);
  const survivorHasReferralCode = (await countReferralCodes(db, survivorId)) > 0;
  let referralCodesClaimed = survivorHasReferralCode;

  const absorbed: MergePreview["absorbed"] = [];
  let totalEntities = 0;
  let totalPositions = 0;
  let totalInvested = 0;

  for (const id of absorbedIds) {
    const profile = byId.get(id)!;
    const name = fullName(profile);

    // A different name is the loudest signal these are NOT the same person.
    if (norm(name ?? "") !== norm(survivorName ?? "")) {
      warnings.push(
        `Names differ: survivor is "${survivorName ?? "—"}" but ${
          profile.email ?? id
        } is "${name ?? "—"}". These may not be the same person — verify before merging.`,
      );
    }

    const mine = entities.filter((e) => e.owner_user_id === id);
    const rows = mine.map((e) => {
      const newDisplayName = resolveDisplayName(e, profile.email, taken);
      taken.add(norm(newDisplayName));
      const s = stats.get(e.id) ?? { positions: 0, invested: 0 };
      totalEntities += 1;
      totalPositions += s.positions;
      totalInvested += s.invested;
      return {
        id: e.id,
        display_name: e.display_name,
        newDisplayName,
        // Reported as-is. The merge never writes this column — the entity keeps
        // the address it corresponded under.
        email: e.email,
        is_primary: e.is_primary,
        willDemote: e.is_primary,
        positions: s.positions,
        invested: s.invested,
      };
    });

    const referralCodes = await countReferralCodes(db, id);
    if (referralCodes > 0) {
      if (referralCodesClaimed) {
        warnings.push(
          `Referral-code conflict: ${
            profile.email ?? id
          } has ${referralCodes} referral code(s) but the survivor already has one. ` +
            "Those codes will be LEFT on the absorbed login (not moved) — reissue manually if the survivor should keep them.",
        );
      } else {
        // The first absorbed login with codes claims the survivor's slot.
        referralCodesClaimed = true;
      }
    }

    absorbed.push({
      id,
      name,
      email: profile.email,
      entities: rows,
      referralCodes,
    });
  }

  return {
    survivor: {
      id: survivorId,
      name: survivorName,
      email: survivorProfile.email,
      entityCount: survivorEntities.length,
    },
    absorbed,
    totals: {
      entities: totalEntities,
      positions: totalPositions,
      invested: totalInvested,
    },
    warnings,
  };
}

/**
 * Re-point every absorbed login's entities (and their rows) at the survivor,
 * then ban the absorbed logins.
 *
 * Step order is load-bearing — there is no cross-statement transaction:
 *   1. re-derive the preview server-side (never trust the caller's copy)
 *   2. demote absorbed primaries + rename colliding display_names
 *      (BEFORE the owner flip, or the one-primary unique index throws)
 *   3. flip owner_user_id  → RLS now shows the rows to the survivor
 *   4. re-point the denormalized user_id on all five tables
 *   5. move login-level referral rows (or report the conflict)
 *   6. BAN the absorbed auth users (never delete — ON DELETE RESTRICT)
 *   7. log
 * Every step is idempotent, so a re-run after a mid-way failure converges.
 *
 * `authAdmin` must be a service-role client (auth.admin.updateUserById).
 */
export async function mergeLoginsCore(
  db: Db,
  authAdmin: Db,
  survivorId: string,
  absorbedIds: string[],
): Promise<MergeResult> {
  const unique = [...new Set(absorbedIds)];
  if (unique.length === 0) return { error: "Select at least one login to merge." };
  if (unique.includes(survivorId)) {
    return { error: "The survivor cannot also be an absorbed login." };
  }

  // 1. Re-derive server-side. Also validates every id is a real profile.
  let preview: MergePreview;
  try {
    preview = await buildMergePreview(db, survivorId, unique);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }

  const moved = preview.absorbed.flatMap((a) => a.entities);
  const movedIds = moved.map((e) => e.id);
  const renamed: Array<{ from: string; to: string }> = [];
  let demoted = 0;

  // 2. Demote primaries and resolve display-name collisions BEFORE the flip.
  for (const entity of moved) {
    const patch: Record<string, unknown> = {};
    if (entity.willDemote) patch.is_primary = false;
    if (entity.newDisplayName !== entity.display_name) {
      patch.display_name = entity.newDisplayName;
    }
    if (Object.keys(patch).length === 0) continue;

    const { error } = await db
      .from("investor_entities")
      .update(patch)
      .eq("id", entity.id);
    if (error) {
      return {
        error: `Failed to prepare entity "${entity.display_name}": ${error.message}`,
      };
    }
    if (entity.willDemote) demoted += 1;
    if (patch.display_name) {
      renamed.push({ from: entity.display_name, to: entity.newDisplayName });
    }
  }

  // 3. Flip ownership. From here on the survivor's RLS covers these rows.
  if (movedIds.length > 0) {
    const { error } = await db
      .from("investor_entities")
      .update({ owner_user_id: survivorId })
      .in("id", movedIds);
    if (error) return { error: `Failed to move entities: ${error.message}` };
  }

  // 4. Re-point the denormalized user_id on every entity-scoped table.
  const rowsRepointed: Record<string, number> = {};
  let visibilityDuplicatesDropped = 0;

  if (movedIds.length > 0) {
    for (const table of ENTITY_SCOPED_TABLES) {
      if (table === "note_visibility") {
        // Composite PK (note_id, user_id): if the survivor ALREADY has a grant
        // for this note, re-pointing user_id would violate the PK. The survivor
        // can already see that note (the notes policy is per-login, via any
        // owned entity), so the duplicate grant is dropped, not lost access.
        const { data: visRows, error: visErr } = await db
          .from("note_visibility")
          .select("note_id, user_id")
          .in("entity_id", movedIds);
        if (visErr) {
          return { error: `note_visibility lookup: ${visErr.message}` };
        }

        let moves = 0;
        for (const row of (visRows ?? []) as Array<{
          note_id: string;
          user_id: string | null;
        }>) {
          if (row.user_id === survivorId) continue; // already re-pointed
          const { count, error: dupErr } = await db
            .from("note_visibility")
            .select("*", { count: "exact", head: true })
            .eq("note_id", row.note_id)
            .eq("user_id", survivorId);
          if (dupErr) {
            return { error: `note_visibility conflict check: ${dupErr.message}` };
          }

          if ((count ?? 0) > 0) {
            const { error: delErr } = await db
              .from("note_visibility")
              .delete()
              .eq("note_id", row.note_id)
              .eq("user_id", row.user_id!);
            if (delErr) {
              return { error: `note_visibility dedupe: ${delErr.message}` };
            }
            visibilityDuplicatesDropped += 1;
            continue;
          }

          const { error: updErr } = await db
            .from("note_visibility")
            .update({ user_id: survivorId })
            .eq("note_id", row.note_id)
            .eq("user_id", row.user_id!);
          if (updErr) {
            return { error: `note_visibility re-point: ${updErr.message}` };
          }
          moves += 1;
        }
        rowsRepointed[table] = moves;
        continue;
      }

      // Every row of a moved entity, including ones whose user_id is already the
      // survivor (a re-run) or NULL (a registration made before the login
      // existed) — `neq` would silently skip NULLs and strand them.
      const { data, error } = await db
        .from(table)
        .update({ user_id: survivorId })
        .in("entity_id", movedIds)
        .select("id");
      if (error) {
        return { error: `Failed to re-point ${table}: ${error.message}` };
      }
      rowsRepointed[table] = (data ?? []).length;
    }
  }

  // 5. Login-level referral rows. referral_codes.code is globally unique and a
  //    login is only ever meant to have ONE code, so a second one is REPORTED,
  //    never blindly moved.
  const warnings = [...preview.warnings];
  let referralCodesMoved = 0;
  let referralCodesLeftBehind = 0;
  let referralsMoved = 0;

  for (const a of preview.absorbed) {
    const survivorCodes = await countReferralCodes(db, survivorId).catch(
      () => 0,
    );
    if (a.referralCodes > 0) {
      if (survivorCodes > 0) {
        referralCodesLeftBehind += a.referralCodes;
      } else {
        const { data, error } = await db
          .from("referral_codes")
          .update({ user_id: survivorId })
          .eq("user_id", a.id)
          .select("id");
        if (error) {
          return { error: `Failed to move referral codes: ${error.message}` };
        }
        referralCodesMoved += (data ?? []).length;
      }
    }

    // referrals have no uniqueness on the referrer — always move them, so the
    // survivor keeps credit for everyone this login referred.
    const { data: refRows, error: refErr } = await db
      .from("referrals")
      .update({ referrer_id: survivorId })
      .eq("referrer_id", a.id)
      .select("id");
    if (refErr) return { error: `Failed to move referrals: ${refErr.message}` };
    referralsMoved += (refRows ?? []).length;

    // Someone referred the absorbed login: that referee is now the survivor.
    const { error: refereeErr } = await db
      .from("referrals")
      .update({ referred_user_id: survivorId })
      .eq("referred_user_id", a.id);
    if (refereeErr) {
      return { error: `Failed to re-point referrals: ${refereeErr.message}` };
    }
  }

  // 6. BAN the absorbed logins. Never delete: participations.user_id is
  //    ON DELETE RESTRICT, and a delete would cascade rows away elsewhere.
  const bannedUserIds: string[] = [];
  for (const a of preview.absorbed) {
    const { error } = await authAdmin.auth.admin.updateUserById(a.id, {
      ban_duration: BAN_DURATION,
    });
    if (error) {
      return {
        error: `Entities moved, but banning ${
          a.email ?? a.id
        } failed: ${error.message}. Re-run the merge — it is safe to repeat.`,
      };
    }
    bannedUserIds.push(a.id);
  }

  const summary: MergeSummary = {
    survivorId,
    absorbedIds: unique,
    entitiesMoved: moved.length,
    positionsMoved: preview.totals.positions,
    investedMoved: preview.totals.invested,
    demoted,
    renamed,
    rowsRepointed,
    visibilityDuplicatesDropped,
    referralCodesMoved,
    referralCodesLeftBehind,
    referralsMoved,
    bannedUserIds,
    warnings,
  };

  // 7. Log. `activities` is a LENDER-FACING money feed (user_id, amount,
  //    activity_date, and a "read own" policy) — an audit row there would show
  //    up in the lender's statement, so it is the wrong home for this. A
  //    structured console line is the honest option until an audit table exists.
  console.info(
    "[merge-logins]",
    JSON.stringify({ event: "logins_merged", at: new Date().toISOString(), ...summary }),
  );

  return { summary };
}
