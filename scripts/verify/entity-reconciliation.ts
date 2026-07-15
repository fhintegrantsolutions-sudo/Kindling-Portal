/**
 * Reconcile the investor_entities migration: a re-runnable, read-only
 * data-integrity check that the entity layer is internally consistent.
 *
 * Works against EITHER database, selected by env file:
 *   VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-reconciliation.ts
 *   VERIFY_ENV=.env.local   npx tsx scripts/verify/entity-reconciliation.ts
 *
 * (Default is .env.staging.) Uses the service-role client so RLS is bypassed —
 * this is a data-integrity check, not a security check. It only ever reads.
 *
 * Exit code 0 == every assertion passed.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

const ENV_FILE = process.env.VERIFY_ENV ?? ".env.staging";
const env = config({ path: ENV_FILE }).parsed ?? {};

const URL = env.STAGING_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE =
  env.STAGING_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_ROLE) {
  console.error(
    `Missing Supabase URL / service-role key in ${ENV_FILE}. ` +
      "Expected STAGING_SUPABASE_URL + STAGING_SERVICE_ROLE_KEY, or " +
      "NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const db = createClient(URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Tables that carry a nullable entity_id alongside user_id. */
const ENTITY_SCOPED_TABLES = [
  "participations",
  "note_registrations",
  "beneficiaries",
  "documents",
  "note_visibility",
] as const;

/**
 * Ownership-consistency scan reads at most this many rows per table. Fine at
 * current data volumes; if any table ever exceeds it, page with .range().
 */
const SCAN_LIMIT = 1000;

let failures = 0;

function ok(msg: string) {
  console.log(`ok:   ${msg}`);
}

function fail(msg: string) {
  failures += 1;
  console.log(`FAIL: ${msg}`);
}

/** Exact row count, no rows transferred. */
async function countRows(
  table: string,
  apply?: (q: ReturnType<typeof buildCountQuery>) => unknown,
): Promise<number> {
  const q = buildCountQuery(table);
  const query = (apply ? apply(q) : q) as typeof q;
  const { count, error } = await query;
  if (error) throw new Error(`count(${table}): ${error.message}`);
  return count ?? 0;
}

function buildCountQuery(table: string) {
  return db.from(table).select("*", { count: "exact", head: true });
}

async function main() {
  console.log(`entity reconciliation`);
  console.log(`env file: ${ENV_FILE}`);
  console.log(`database: ${URL}`);
  console.log("");

  const profileCount = await countRows("profiles");
  const entityCount = await countRows("investor_entities");

  // A login may own MANY entities (Phase 2), so entity count is NOT pinned to
  // profile count. What must hold: every profile owns >= 1 entity, and exactly
  // one of a profile's entities is primary.
  const { data: allEntities, error: allEntityErr } = await db
    .from("investor_entities")
    .select("id, owner_user_id, is_primary")
    .limit(SCAN_LIMIT);
  if (allEntityErr) throw new Error(`entity scan: ${allEntityErr.message}`);
  const entities = (allEntities ?? []) as Array<{
    id: string;
    owner_user_id: string;
    is_primary: boolean;
  }>;
  if (entities.length === SCAN_LIMIT) {
    console.log(
      `      (note: entity scan hit the ${SCAN_LIMIT}-row limit; add paging)`,
    );
  }

  const { data: profiles, error: profileErr } = await db
    .from("profiles")
    .select("id")
    .limit(SCAN_LIMIT);
  if (profileErr) throw new Error(`profile scan: ${profileErr.message}`);

  // A merged-away login is BANNED and legitimately owns zero entities — its
  // entities were re-parented to the survivor. Exclude banned auth users from
  // the "every profile owns exactly one primary" invariant; it only applies to
  // active logins. (auth.admin.listUsers is paginated.)
  const bannedIds = new Set<string>();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    if (!data.users.length) break;
    for (const u of data.users) {
      const until = (u as { banned_until?: string | null }).banned_until;
      if (until && new Date(until) > new Date()) bannedIds.add(u.id);
    }
    if (data.users.length < 200) break;
  }

  const profileIds = (profiles ?? [])
    .map((p) => p.id as string)
    .filter((id) => !bannedIds.has(id));
  if (bannedIds.size > 0) {
    console.log(
      `      (excluding ${bannedIds.size} banned/merged login(s) from the owns-a-primary checks)`,
    );
  }

  const entitiesPerOwner = new Map<string, number>();
  const primaryPerOwner = new Map<string, number>();
  for (const e of entities) {
    entitiesPerOwner.set(
      e.owner_user_id,
      (entitiesPerOwner.get(e.owner_user_id) ?? 0) + 1,
    );
    if (e.is_primary) {
      primaryPerOwner.set(
        e.owner_user_id,
        (primaryPerOwner.get(e.owner_user_id) ?? 0) + 1,
      );
    }
  }

  console.log(
    `      (${entityCount} entity/entities across ${profileCount} profile(s) — multi-entity logins are legal)`,
  );

  // 1. Every profile owns at least one entity.
  const entitylessProfiles = profileIds.filter(
    (id) => (entitiesPerOwner.get(id) ?? 0) === 0,
  );
  if (entitylessProfiles.length === 0) {
    ok(`all ${profileIds.length} profile(s) own at least one entity`);
  } else {
    fail(
      `${entitylessProfiles.length} profile(s) own zero entities — e.g. ${entitylessProfiles[0]}`,
    );
  }

  // 2. Every profile has EXACTLY one primary entity (a partial unique index
  //    enforces <= 1; assert >= 1 here so "zero primaries" is also a failure).
  const noPrimary = profileIds.filter(
    (id) => (primaryPerOwner.get(id) ?? 0) === 0,
  );
  if (noPrimary.length === 0) {
    ok(`all ${profileIds.length} profile(s) have exactly one primary entity`);
  } else {
    fail(
      `${noPrimary.length} profile(s) have no primary entity — e.g. ${noPrimary[0]}`,
    );
  }

  // 3. No login has 2+ primary entities (a unique index should guarantee this).
  const multiPrimary = [...primaryPerOwner.entries()].filter(([, n]) => n > 1);
  if (multiPrimary.length === 0) {
    ok("no login has more than one primary entity");
  } else {
    fail(
      `${multiPrimary.length} login(s) have 2+ primary entities: ${multiPrimary
        .map(([owner, n]) => `${owner} (${n})`)
        .join(", ")}`,
    );
  }

  // 4. No orphans: a row that belongs to a login must carry an entity_id.
  for (const table of ENTITY_SCOPED_TABLES) {
    const orphans = await countRows(table, (q) =>
      q.not("user_id", "is", null).is("entity_id", null),
    );
    if (orphans === 0) {
      ok(`${table}: no rows with user_id set but entity_id null`);
    } else {
      fail(
        `${table}: ${orphans} row(s) have user_id set but entity_id null (orphaned by the backfill)`,
      );
    }
  }

  // 5. Ownership consistency: the row's entity must be owned by the row's user.
  for (const table of ENTITY_SCOPED_TABLES) {
    // NB: no `id` in the select — note_visibility has a composite key, no id column.
    const { data, error } = await db
      .from(table)
      .select("user_id, entity_id, entity:investor_entities!inner(owner_user_id)")
      .not("entity_id", "is", null)
      .limit(SCAN_LIMIT);
    if (error) throw new Error(`${table} ownership scan: ${error.message}`);

    const rows = (data ?? []) as unknown as Array<{
      user_id: string | null;
      entity_id: string;
      entity: { owner_user_id: string } | { owner_user_id: string }[];
    }>;

    if (rows.length === SCAN_LIMIT) {
      console.log(
        `      (note: ${table} ownership scan hit the ${SCAN_LIMIT}-row limit; add paging)`,
      );
    }

    const mismatched = rows.filter((r) => {
      const entity = Array.isArray(r.entity) ? r.entity[0] : r.entity;
      return !entity || entity.owner_user_id !== r.user_id;
    });

    if (mismatched.length === 0) {
      ok(`${table}: all ${rows.length} entity_id row(s) owned by the row's user`);
    } else {
      fail(
        `${table}: ${mismatched.length} row(s) point at an entity owned by a different user — ` +
          `e.g. user_id=${mismatched[0].user_id} entity_id=${mismatched[0].entity_id}`,
      );
    }
  }

  // 6. Every entity owner corresponds to an existing profile. (owner_user_id
  // FKs auth.users, not profiles, so there is no embeddable relation — compare
  // the id sets in JS. Reuses the scans from checks 1-3.)
  const profileIdSet = new Set(profileIds);
  const ownerless = entities.filter((e) => !profileIdSet.has(e.owner_user_id));
  if (ownerless.length === 0) {
    ok(`all ${entities.length} entity owner_user_id(s) resolve to a profile`);
  } else {
    fail(
      `${ownerless.length} entity/entities have an owner_user_id with no profile — ` +
        `e.g. entity ${ownerless[0].id} owner ${ownerless[0].owner_user_id}`,
    );
  }

  console.log("");
  console.log(
    failures === 0 ? "RECONCILIATION PASS" : `RECONCILIATION FAIL (${failures})`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`❌ ERROR: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
