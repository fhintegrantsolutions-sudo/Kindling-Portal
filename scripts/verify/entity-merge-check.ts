/**
 * Merge harness — end-to-end proof that consolidating two logins into one
 * loses NOTHING and that the survivor can actually SEE what moved.
 *
 * It seeds a second login for the same person (Ada Alpha), runs the REAL merge
 * code (`mergeLoginsCore` from src/lib/admin/merge-core.ts — the same function
 * the admin action calls), asserts the invariants, then signs in AS THE
 * SURVIVOR with the anon key and checks the merged-in position is visible
 * through Postgres RLS. Finally it removes everything it created, leaving
 * staging exactly as `seed-staging.ts` left it.
 *
 * Requires the staging seed:
 *   npx tsx scripts/verify/seed-staging.ts
 *
 * Usage:
 *   VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-merge-check.ts
 *
 * Exit code 0 == every assertion passed.
 */
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mergeLoginsCore, buildMergePreview } from "../../src/lib/admin/merge-core";

const ENV_FILE = process.env.VERIFY_ENV ?? ".env.staging";
const env = config({ path: ENV_FILE }).parsed ?? {};

const URL = env.STAGING_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.STAGING_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE =
  env.STAGING_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON_KEY || !SERVICE_ROLE) {
  console.error(
    `Missing Supabase URL / anon key / service-role key in ${ENV_FILE}. ` +
      "Expected STAGING_SUPABASE_URL + STAGING_ANON_KEY + STAGING_SERVICE_ROLE_KEY, or " +
      "NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

/** The seeded survivor: owns "Personal" (primary) + "Alpha Holdings LLC". */
const SURVIVOR = { email: "rls-a@example.com", password: "Test-pass-A1!" };
/** The duplicate login this harness creates — same human, second account. */
const ABSORBED = {
  email: "merge-dup-a@example.com",
  password: "Test-pass-M1!",
  first_name: "Ada",
  last_name: "Alpha",
};
const PUBLIC_NOTE_ID = "SEED-PUB-001";
const PRIVATE_NOTE_ID = "SEED-PRV-001";
/** Deliberately collides with the survivor's primary entity name. */
const DUP_ENTITY_NAME = "Personal";
const DUP_INVESTED = 12345;

const admin: SupabaseClient = createClient(URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let failures = 0;
const ok = (m: string) => console.log(`ok:   ${m}`);
const fail = (m: string) => {
  failures += 1;
  console.log(`FAIL: ${m}`);
};
const check = (cond: boolean, m: string) => (cond ? ok(m) : fail(m));

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    if (!data.users.length) return null;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
}

async function noteUuid(humanId: string): Promise<string> {
  const { data, error } = await admin
    .from("notes")
    .select("id")
    .eq("note_id", humanId)
    .single();
  if (error || !data) {
    throw new Error(
      `seed note ${humanId} not found — run \`npx tsx scripts/verify/seed-staging.ts\``,
    );
  }
  return data.id as string;
}

async function entitiesOf(ownerId: string) {
  const { data, error } = await admin
    .from("investor_entities")
    .select("id, display_name, is_primary")
    .eq("owner_user_id", ownerId);
  if (error) throw new Error(`entities of ${ownerId}: ${error.message}`);
  return (data ?? []) as Array<{
    id: string;
    display_name: string;
    is_primary: boolean;
  }>;
}

/** positions + invested across a set of entities (service role: the truth). */
async function positionStats(entityIds: string[]) {
  if (entityIds.length === 0) return { positions: 0, invested: 0 };
  const { data, error } = await admin
    .from("participations")
    .select("id, invested_amount")
    .in("entity_id", entityIds);
  if (error) throw new Error(`position stats: ${error.message}`);
  const rows = (data ?? []) as Array<{
    id: string;
    invested_amount: string | number | null;
  }>;
  return {
    positions: rows.length,
    invested: rows.reduce((sum, r) => sum + Number(r.invested_amount ?? 0), 0),
  };
}

/** Everything the harness creates, so the finally block can undo it exactly. */
const created = {
  absorbedUserId: null as string | null,
  entityId: null as string | null,
  participationId: null as string | null,
  beneficiaryId: null as string | null,
  documentId: null as string | null,
  registrationId: null as string | null,
  referralCodeId: null as string | null,
  visibilityNoteIds: [] as string[],
};

async function seedDuplicateLogin(publicNote: string, privateNote: string) {
  // Idempotence: a previous crashed run may have left this login behind.
  const stale = await findUserId(ABSORBED.email);
  if (stale) {
    const staleEntities = await entitiesOf(stale);
    const ids = staleEntities.map((e) => e.id);
    if (ids.length) {
      await admin.from("participations").delete().in("entity_id", ids);
      await admin.from("beneficiaries").delete().in("entity_id", ids);
      await admin.from("documents").delete().in("entity_id", ids);
      await admin.from("note_registrations").delete().in("entity_id", ids);
      await admin.from("note_visibility").delete().in("entity_id", ids);
      await admin.from("investor_entities").delete().in("id", ids);
    }
    await admin.from("participations").delete().eq("user_id", stale);
    await admin.from("referral_codes").delete().eq("user_id", stale);
    await admin.auth.admin.deleteUser(stale);
    console.log(`      (removed a stale ${ABSORBED.email} from an earlier run)`);
  }

  const { data: user, error: userErr } = await admin.auth.admin.createUser({
    email: ABSORBED.email,
    password: ABSORBED.password,
    email_confirm: true,
  });
  if (userErr) throw new Error(`create absorbed user: ${userErr.message}`);
  const absorbedId = user.user.id;
  created.absorbedUserId = absorbedId;

  // The on_auth_user_created trigger already made the profiles row.
  const { error: profErr } = await admin
    .from("profiles")
    .update({
      first_name: ABSORBED.first_name,
      last_name: ABSORBED.last_name,
      phone: "512-555-0999",
    })
    .eq("id", absorbedId);
  if (profErr) throw new Error(`profile update: ${profErr.message}`);

  // Their ONE entity — primary, and named exactly like the survivor's primary.
  const { data: entity, error: entErr } = await admin
    .from("investor_entities")
    .insert({
      owner_user_id: absorbedId,
      display_name: DUP_ENTITY_NAME,
      entity_type: "Individual",
      business_name: null,
      loan_agreement_title: "Ada Alpha",
      address_street: "100 A St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      is_primary: true,
    })
    .select("id")
    .single();
  if (entErr) throw new Error(`create absorbed entity: ${entErr.message}`);
  const entityId = entity.id as string;
  created.entityId = entityId;

  const { data: part, error: partErr } = await admin
    .from("participations")
    .insert({
      user_id: absorbedId,
      entity_id: entityId,
      note_id: publicNote,
      invested_amount: DUP_INVESTED,
      status: "Active",
      funding_received: true,
    })
    .select("id")
    .single();
  if (partErr) throw new Error(`create absorbed participation: ${partErr.message}`);
  created.participationId = part.id as string;

  const { data: bene, error: beneErr } = await admin
    .from("beneficiaries")
    .insert({
      user_id: absorbedId,
      entity_id: entityId,
      name: "Andy Alpha",
      relation: "Sibling",
      percentage: 100,
      type: "Primary",
      phone: "512-555-0998",
    })
    .select("id")
    .single();
  if (beneErr) throw new Error(`create absorbed beneficiary: ${beneErr.message}`);
  created.beneficiaryId = bene.id as string;

  const { data: doc, error: docErr } = await admin
    .from("documents")
    .insert({
      user_id: absorbedId,
      entity_id: entityId,
      type: "W-9",
      file_name: "merge-harness-w9.pdf",
      file_url: "https://staging.example/merge-harness/w9.pdf",
      status: "Approved",
    })
    .select("id")
    .single();
  if (docErr) throw new Error(`create absorbed document: ${docErr.message}`);
  created.documentId = doc.id as string;

  const { data: reg, error: regErr } = await admin
    .from("note_registrations")
    .insert({
      user_id: absorbedId,
      entity_id: entityId,
      note_id: publicNote,
      first_name: ABSORBED.first_name,
      last_name: ABSORBED.last_name,
      phone: "512-555-0999",
      email: ABSORBED.email,
      entity_type: "Individual",
      name_for_agreement: "Ada Alpha",
      investment_amount: DUP_INVESTED,
      acknowledge_lender: true,
    })
    .select("id")
    .single();
  if (regErr) throw new Error(`create absorbed registration: ${regErr.message}`);
  created.registrationId = reg.id as string;

  // Two visibility grants: the PRIVATE note collides with one the survivor
  // already holds (composite PK (note_id, user_id)) and must be deduped; the
  // PUBLIC one has no counterpart and must be re-pointed.
  for (const n of [privateNote, publicNote]) {
    const { error } = await admin
      .from("note_visibility")
      .insert({ note_id: n, user_id: absorbedId, entity_id: entityId });
    if (error) throw new Error(`create note_visibility: ${error.message}`);
    created.visibilityNoteIds.push(n);
  }

  const { data: code, error: codeErr } = await admin
    .from("referral_codes")
    .insert({ user_id: absorbedId, code: `MERGE-HARNESS-${Date.now()}` })
    .select("id")
    .single();
  if (codeErr) throw new Error(`create referral code: ${codeErr.message}`);
  created.referralCodeId = code.id as string;

  return { absorbedId, entityId };
}

async function cleanup(survivorId: string) {
  console.log("");
  console.log("cleanup");
  const ids = [created.entityId].filter(Boolean) as string[];

  if (created.participationId) {
    await admin.from("participations").delete().eq("id", created.participationId);
  }
  if (created.beneficiaryId) {
    await admin.from("beneficiaries").delete().eq("id", created.beneficiaryId);
  }
  if (created.documentId) {
    await admin.from("documents").delete().eq("id", created.documentId);
  }
  if (created.registrationId) {
    await admin.from("note_registrations").delete().eq("id", created.registrationId);
  }
  if (ids.length) {
    // Any visibility grant that travelled with the entity (the deduped one is
    // already gone; the survivor's own pre-existing grant has entity_id = the
    // survivor's entity and is therefore untouched).
    await admin.from("note_visibility").delete().in("entity_id", ids);
  }
  if (created.referralCodeId) {
    await admin.from("referral_codes").delete().eq("id", created.referralCodeId);
  }
  if (ids.length) {
    const { error } = await admin
      .from("investor_entities")
      .delete()
      .in("id", ids);
    if (error) fail(`cleanup: could not delete merged entity: ${error.message}`);
  }
  if (created.absorbedUserId) {
    const { error } = await admin.auth.admin.deleteUser(created.absorbedUserId);
    if (error) fail(`cleanup: could not delete absorbed auth user: ${error.message}`);
  }

  const left = await entitiesOf(survivorId);
  const primaries = left.filter((e) => e.is_primary).length;
  check(
    left.length === 2 && primaries === 1,
    `cleanup: survivor back to their seeded 2 entities, 1 primary (got ${left.length}/${primaries})`,
  );
}

async function main() {
  console.log("entity merge check");
  console.log(`env file: ${ENV_FILE}`);
  console.log(`database: ${URL}`);
  console.log("");

  const survivorId = await findUserId(SURVIVOR.email);
  if (!survivorId) {
    throw new Error(
      `survivor ${SURVIVOR.email} not found — run \`npx tsx scripts/verify/seed-staging.ts\``,
    );
  }
  const publicNote = await noteUuid(PUBLIC_NOTE_ID);
  const privateNote = await noteUuid(PRIVATE_NOTE_ID);

  try {
    // Seeding lives INSIDE the try so a half-built fixture is still torn down.
    console.log("[seed] creating a duplicate login for the same person…");
    const { absorbedId, entityId } = await seedDuplicateLogin(
      publicNote,
      privateNote,
    );
    console.log(`      survivor ${SURVIVOR.email} ${survivorId}`);
    console.log(`      absorbed ${ABSORBED.email} ${absorbedId} (entity ${entityId})`);
    console.log("");

    // ---- BEFORE ------------------------------------------------------------
    const survivorEntitiesBefore = await entitiesOf(survivorId);
    const absorbedEntitiesBefore = await entitiesOf(absorbedId);
    const allEntityIds = [
      ...survivorEntitiesBefore.map((e) => e.id),
      ...absorbedEntitiesBefore.map((e) => e.id),
    ];
    const before = await positionStats(allEntityIds);
    console.log(
      `[before] survivor owns ${survivorEntitiesBefore.length} entity/entities, ` +
        `absorbed owns ${absorbedEntitiesBefore.length}; ` +
        `${before.positions} position(s), ${before.invested} invested across both`,
    );

    // ---- PREVIEW (read only) ----------------------------------------------
    const preview = await buildMergePreview(admin, survivorId, [absorbedId]);
    const previewEntity = preview.absorbed[0]?.entities[0];
    check(
      preview.totals.entities === 1 && preview.totals.positions === 1,
      `preview: 1 entity, 1 position, ${preview.totals.invested} invested will move`,
    );
    check(
      !!previewEntity?.willDemote,
      "preview: the incoming primary is flagged for demotion",
    );
    check(
      !!previewEntity &&
        previewEntity.display_name === DUP_ENTITY_NAME &&
        previewEntity.newDisplayName !== DUP_ENTITY_NAME,
      `preview: colliding "${DUP_ENTITY_NAME}" is renamed to "${previewEntity?.newDisplayName}"`,
    );
    const stillThere = await entitiesOf(absorbedId);
    check(
      stillThere.length === 1 && stillThere[0].is_primary === true,
      "preview wrote NOTHING — the absorbed entity is untouched",
    );
    console.log("");

    // ---- MERGE (the real code path) ---------------------------------------
    console.log("[merge] running mergeLoginsCore (src/lib/admin/merge-core.ts)…");
    const result = await mergeLoginsCore(admin, admin, survivorId, [absorbedId]);
    if (result.error || !result.summary) {
      fail(`merge returned an error: ${result.error}`);
      throw new Error(result.error ?? "merge produced no summary");
    }
    const summary = result.summary;
    console.log(
      `      moved ${summary.entitiesMoved} entity, ${summary.positionsMoved} position(s), ` +
        `${summary.investedMoved} invested; demoted ${summary.demoted}; ` +
        `renamed ${summary.renamed.length}; visibility dupes dropped ${summary.visibilityDuplicatesDropped}`,
    );
    console.log("");

    // ---- AFTER: data integrity --------------------------------------------
    const survivorAfter = await entitiesOf(survivorId);
    const absorbedAfter = await entitiesOf(absorbedId);

    check(
      survivorAfter.length === survivorEntitiesBefore.length + absorbedEntitiesBefore.length,
      `survivor owns ALL entities: ${survivorEntitiesBefore.length} + ${absorbedEntitiesBefore.length} = ${survivorAfter.length}`,
    );
    check(
      survivorAfter.some((e) => e.id === entityId),
      "the absorbed entity now belongs to the survivor",
    );

    const primaries = survivorAfter.filter((e) => e.is_primary);
    check(
      primaries.length === 1,
      `survivor has EXACTLY ONE primary entity (got ${primaries.length}: ${primaries
        .map((p) => p.display_name)
        .join(", ")})`,
    );

    const names = survivorAfter.map((e) => e.display_name.trim().toLowerCase());
    check(
      new Set(names).size === names.length,
      `no duplicate display_names among the survivor's entities (${survivorAfter
        .map((e) => `"${e.display_name}"`)
        .join(", ")})`,
    );

    check(
      absorbedAfter.length === 0,
      `the absorbed login owns ZERO entities (got ${absorbedAfter.length})`,
    );

    // Denormalized user_id must have followed the entity, on every table.
    for (const table of [
      "participations",
      "note_registrations",
      "beneficiaries",
      "documents",
      "note_visibility",
    ] as const) {
      const { data, error } = await admin
        .from(table)
        .select("user_id, entity_id")
        .eq("entity_id", entityId);
      if (error) throw new Error(`${table} scan: ${error.message}`);
      const rows = (data ?? []) as Array<{ user_id: string | null }>;
      const stale = rows.filter((r) => r.user_id !== survivorId);
      check(
        rows.length > 0 && stale.length === 0,
        `${table}: all ${rows.length} moved row(s) now carry user_id = survivor`,
      );
    }

    // THE LOAD-BEARING ONE: nothing was lost.
    const after = await positionStats(survivorAfter.map((e) => e.id));
    check(
      after.positions === before.positions && after.invested === before.invested,
      `NOTHING LOST: positions ${before.positions} → ${after.positions}, ` +
        `invested ${before.invested} → ${after.invested} (unchanged)`,
    );

    // The absorbed auth user must be BANNED, not deleted.
    const { data: banned, error: bannedErr } =
      await admin.auth.admin.getUserById(absorbedId);
    if (bannedErr) throw new Error(`getUserById: ${bannedErr.message}`);
    const bannedUntil = (banned.user as unknown as { banned_until?: string | null })
      .banned_until;
    check(
      !!banned.user && !!bannedUntil,
      `absorbed auth user still EXISTS and is BANNED (banned_until=${bannedUntil ?? "null"})`,
    );

    const anon = createClient(URL!, ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: banSignIn, error: banSignInErr } =
      await anon.auth.signInWithPassword({
        email: ABSORBED.email,
        password: ABSORBED.password,
      });
    check(
      !!banSignInErr && !banSignIn.session,
      `the absorbed login can NO LONGER sign in (${banSignInErr?.message ?? "NO ERROR — it still works!"})`,
    );

    // Referral rows moved with the login.
    const { count: codeCount } = await admin
      .from("referral_codes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", survivorId);
    check(
      summary.referralCodesMoved === 1 && (codeCount ?? 0) === 1,
      `the absorbed login's referral code moved to the survivor (moved=${summary.referralCodesMoved}, survivor now has ${codeCount})`,
    );

    // note_visibility: the private-note grant collided with one the survivor
    // already had and was deduped; the public-note grant was re-pointed.
    check(
      summary.visibilityDuplicatesDropped === 1,
      `1 duplicate note_visibility grant dropped (survivor already had that note)`,
    );

    console.log("");

    // ---- AFTER: RLS. Can the survivor actually SEE what moved? -------------
    console.log("[rls] signing in AS THE SURVIVOR and reading through RLS…");
    const { data: session, error: signInErr } = await anon.auth.signInWithPassword(
      SURVIVOR,
    );
    if (signInErr || !session.session) {
      throw new Error(`survivor sign-in failed: ${signInErr?.message}`);
    }
    const asSurvivor = createClient(URL!, ANON_KEY!, {
      global: {
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: seenEnts, error: seenEntErr } = await asSurvivor
      .from("investor_entities")
      .select("id, display_name");
    if (seenEntErr) throw new Error(`survivor entity read: ${seenEntErr.message}`);
    check(
      (seenEnts ?? []).some((e) => e.id === entityId),
      "survivor SEES the merged-in entity under RLS",
    );

    const { data: seenParts, error: seenPartErr } = await asSurvivor
      .from("participations")
      .select("id, entity_id, invested_amount");
    if (seenPartErr) throw new Error(`survivor position read: ${seenPartErr.message}`);
    const seen = (seenParts ?? []) as Array<{
      id: string;
      entity_id: string | null;
      invested_amount: string | number | null;
    }>;
    const mergedIn = seen.filter((p) => p.entity_id === entityId);

    check(
      mergedIn.length === 1 && mergedIn[0].id === created.participationId,
      `SURVIVOR CAN SEE the position that came from the absorbed login ` +
        `(${mergedIn.length} row(s) on the merged entity)`,
    );
    check(
      seen.length === after.positions,
      `survivor sees ALL ${after.positions} of their positions through RLS (got ${seen.length})`,
    );
    const seenInvested = seen.reduce(
      (s, p) => s + Number(p.invested_amount ?? 0),
      0,
    );
    check(
      seenInvested === after.invested,
      `survivor sees the full invested total through RLS (${seenInvested} == ${after.invested})`,
    );
  } finally {
    await cleanup(survivorId);
  }

  console.log("");
  console.log(failures === 0 ? "MERGE CHECK PASS" : `MERGE CHECK FAIL (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`❌ ERROR: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
