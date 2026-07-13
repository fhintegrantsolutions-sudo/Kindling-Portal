/**
 * RLS entity-isolation harness — a re-runnable SECURITY test.
 *
 * Signs in as the two seeded lender logins and queries with THEIR JWTs, so
 * every assertion travels through the real Postgres RLS boundary. The
 * service-role client is used ONLY to look up expected values (user ids,
 * entity ids, true row counts) and to stage/clean up child-table fixtures —
 * never to make an assertion.
 *
 * Requires the staging seed:
 *   npx tsx scripts/verify/seed-staging.ts
 *
 * Usage:
 *   VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-rls-isolation.ts
 *
 * Exit code 0 == every assertion passed.
 */
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

const USER_A = { email: "rls-a@example.com", password: "Test-pass-A1!" };
const USER_B = { email: "rls-b@example.com", password: "Test-pass-B1!" };
const PUBLIC_NOTE_ID = "SEED-PUB-001";
const PRIVATE_NOTE_ID = "SEED-PRV-001";

/** Service-role client: lookups + fixture staging ONLY. Never asserts. */
const admin = createClient(URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let failures = 0;

function ok(msg: string) {
  console.log(`ok:   ${msg}`);
}

function fail(msg: string) {
  failures += 1;
  console.log(`FAIL: ${msg}`);
}

function check(condition: boolean, msg: string) {
  if (condition) ok(msg);
  else fail(msg);
}

/** Sign a seed user in and return a client that carries their JWT. */
async function signIn(
  creds: { email: string; password: string },
): Promise<SupabaseClient> {
  const auth = createClient(URL!, ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await auth.auth.signInWithPassword(creds);
  if (error || !data.session) {
    throw new Error(
      `sign-in failed for ${creds.email}: ${error?.message ?? "no session"}. ` +
        "Run `npx tsx scripts/verify/seed-staging.ts` to (re)create the seed users.",
    );
  }
  return createClient(URL!, ANON_KEY!, {
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Look up a seed user's auth id by email (UUIDs churn between seeds). */
async function findUserId(email: string): Promise<string> {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    if (!data.users.length) break;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  throw new Error(
    `seed user ${email} not found. Run \`npx tsx scripts/verify/seed-staging.ts\` first.`,
  );
}

/** Rows visible to `client`, or a throwing error. */
async function rows(
  client: SupabaseClient,
  table: string,
  select: string,
  apply?: (q: any) => any,
): Promise<any[]> {
  const base = client.from(table).select(select);
  const { data, error } = await (apply ? apply(base) : base);
  if (error) throw new Error(`${table} select as lender: ${error.message}`);
  return (data ?? []) as any[];
}

async function main() {
  console.log("entity RLS isolation");
  console.log(`env file: ${ENV_FILE}`);
  console.log(`database: ${URL}`);
  console.log("");

  // ---- expected values, via service role (lookups only) -------------------
  const userA = await findUserId(USER_A.email);
  const userB = await findUserId(USER_B.email);

  const { data: allEntities, error: entErr } = await admin
    .from("investor_entities")
    .select("id, owner_user_id")
    .in("owner_user_id", [userA, userB]);
  if (entErr) throw new Error(`entity lookup: ${entErr.message}`);
  const entitiesA = (allEntities ?? [])
    .filter((e) => e.owner_user_id === userA)
    .map((e) => e.id as string);
  const entitiesB = (allEntities ?? [])
    .filter((e) => e.owner_user_id === userB)
    .map((e) => e.id as string);
  if (entitiesA.length === 0 || entitiesB.length === 0) {
    throw new Error(
      "seed users have no investor_entities — run the backfill/seed " +
        "(`npx tsx scripts/verify/seed-staging.ts`) before this harness.",
    );
  }

  const { count: expectedPartsA, error: partCountErr } = await admin
    .from("participations")
    .select("*", { count: "exact", head: true })
    .in("entity_id", entitiesA);
  if (partCountErr) throw new Error(`participation count: ${partCountErr.message}`);

  const { data: partsB, error: partsBErr } = await admin
    .from("participations")
    .select("id")
    .in("entity_id", entitiesB);
  if (partsBErr) throw new Error(`B participation lookup: ${partsBErr.message}`);
  if (!partsB?.length) throw new Error("seed user B has no participations");
  const partB = partsB[0].id as string;
  const noteIdOfPartB = (
    await admin.from("participations").select("note_id").eq("id", partB).single()
  ).data?.note_id as string;

  console.log(
    `user A ${userA} (${entitiesA.length} entity/entities, ${expectedPartsA} participation(s))`,
  );
  console.log(`user B ${userB} (${entitiesB.length} entity/entities)`);
  console.log("");

  const a = await signIn(USER_A);
  const b = await signIn(USER_B);

  // ======================= POSITIVE: A sees all of A's =====================

  // 1. A sees exactly A's entities.
  const aEntities = await rows(a, "investor_entities", "id, owner_user_id");
  const aEntityIds = aEntities.map((e) => e.id as string).sort();
  check(
    aEntityIds.length === entitiesA.length &&
      aEntityIds.join() === [...entitiesA].sort().join(),
    `A sees exactly A's ${entitiesA.length} entity/entities (got ${aEntityIds.length})`,
  );

  // 2. A sees ALL participations of A's entities, and nothing else.
  const aParts = await rows(a, "participations", "id, entity_id");
  const strayPart = aParts.find(
    (p) => !entitiesA.includes(p.entity_id as string),
  );
  check(
    aParts.length === expectedPartsA && !strayPart,
    `A sees all ${expectedPartsA} participation(s) across A's entities, all entity_id-owned by A ` +
      `(got ${aParts.length}${strayPart ? `, stray entity_id ${strayPart.entity_id}` : ""})`,
  );

  // 3. A sees A's beneficiary and A's document.
  const aBene = await rows(a, "beneficiaries", "id, entity_id");
  check(
    aBene.length > 0 &&
      aBene.every((r) => entitiesA.includes(r.entity_id as string)),
    `A sees A's beneficiary/ies (${aBene.length}), all entity-owned by A`,
  );
  const aDocs = await rows(a, "documents", "id, entity_id");
  check(
    aDocs.length > 0 &&
      aDocs.every((r) => entitiesA.includes(r.entity_id as string)),
    `A sees A's document(s) (${aDocs.length}), all entity-owned by A`,
  );

  // 4. A sees the PRIVATE note (granted via note_visibility on A's entity).
  const aPrivate = await rows(a, "notes", "id, note_id", (q) =>
    q.eq("note_id", PRIVATE_NOTE_ID),
  );
  check(aPrivate.length === 1, `A sees the private note ${PRIVATE_NOTE_ID}`);

  // 5. A sees the PUBLIC note.
  const aPublic = await rows(a, "notes", "id, note_id", (q) =>
    q.eq("note_id", PUBLIC_NOTE_ID),
  );
  check(aPublic.length === 1, `A sees the public note ${PUBLIC_NOTE_ID}`);

  // ======================= NEGATIVE: A sees none of B's ====================

  // 6. A sees zero of B's entities.
  const aSeesBEntities = await rows(a, "investor_entities", "id", (q) =>
    q.in("id", entitiesB),
  );
  check(
    aSeesBEntities.length === 0,
    `A sees 0 of B's entities (got ${aSeesBEntities.length})`,
  );

  // 7. A sees zero of B's participations.
  const aSeesBParts = await rows(a, "participations", "id", (q) =>
    q.in("entity_id", entitiesB),
  );
  check(
    aSeesBParts.length === 0,
    `A sees 0 of B's participations (got ${aSeesBParts.length})`,
  );

  // 8. A sees zero of B's beneficiaries.
  const aSeesBBene = await rows(a, "beneficiaries", "id", (q) =>
    q.in("entity_id", entitiesB),
  );
  check(
    aSeesBBene.length === 0,
    `A sees 0 of B's beneficiaries (got ${aSeesBBene.length})`,
  );

  // 9. B does NOT see the private note (no visibility grant, no participation).
  const bPrivate = await rows(b, "notes", "id, note_id", (q) =>
    q.eq("note_id", PRIVATE_NOTE_ID),
  );
  check(
    bPrivate.length === 0,
    `B does NOT see the private note ${PRIVATE_NOTE_ID} (got ${bPrivate.length})`,
  );

  // ======================= WRITE ISOLATION =================================

  const someNoteId = aPublic[0]?.id as string | undefined;
  if (!someNoteId) throw new Error("public seed note not found — reseed staging");

  // 10. A cannot INSERT a participation onto B's entity.
  const badRes = await a
    .from("participations")
    .insert({
      user_id: userA,
      note_id: someNoteId,
      entity_id: entitiesB[0],
      invested_amount: 1,
      status: "Active",
    })
    .select("id");
  const badErr = badRes.error;
  const badInsert = badRes.data as { id: string }[] | null;
  const rlsRejected =
    !!badErr && /row-level security|violates row-level/i.test(badErr.message);
  check(
    rlsRejected && !badInsert?.length,
    `A INSERT of a participation on B's entity is REJECTED by RLS ` +
      `(${badErr ? badErr.message : "NO ERROR — row was written!"})`,
  );
  // Belt and braces: if it somehow landed, remove it.
  if (badInsert?.length) {
    await admin.from("participations").delete().eq("id", badInsert[0].id);
  }

  // 11. CONTROL: the same INSERT on A's OWN entity SUCCEEDS (proves #10 failed
  //     for RLS reasons, not because the statement is broken).
  const goodRes = await a
    .from("participations")
    .insert({
      user_id: userA,
      note_id: someNoteId,
      entity_id: entitiesA[0],
      invested_amount: 1,
      status: "Active",
    })
    .select("id");
  const goodErr = goodRes.error;
  const goodInsert = goodRes.data as { id: string }[] | null;
  check(
    !goodErr && goodInsert?.length === 1,
    `CONTROL: A INSERT of the same participation on A's OWN entity SUCCEEDS ` +
      `(${goodErr ? goodErr.message : "inserted"})`,
  );
  if (goodInsert?.length) {
    // participations.user_id is ON DELETE RESTRICT elsewhere, but the row
    // itself deletes fine; use service role so cleanup never depends on RLS.
    const { error: delErr } = await admin
      .from("participations")
      .delete()
      .eq("id", goodInsert[0].id);
    if (delErr) {
      fail(`cleanup: could not delete control participation: ${delErr.message}`);
    } else {
      ok("CONTROL row cleaned up");
    }
  }

  // ======================= CHILD-TABLE ISOLATION ===========================
  // Stage child rows on B's participation with the service role, assert A
  // cannot read them, then clean up.

  let childDocId: string | undefined;
  let notePaymentId: string | undefined;
  let payoutId: string | undefined;
  try {
    const { data: doc, error: docErr } = await admin
      .from("participation_documents")
      .insert({
        participation_id: partB,
        type: "Loan Agreement",
        file_name: "rls-harness-b.pdf",
        file_url: "https://staging.example/rls-harness/b.pdf",
      })
      .select("id")
      .single();
    if (docErr) throw new Error(`stage participation_documents: ${docErr.message}`);
    childDocId = doc.id as string;

    const { data: np, error: npErr } = await admin
      .from("note_payments")
      .insert({
        note_id: noteIdOfPartB,
        payment_date: "2026-01-01",
        principal_amount: 100,
        interest_amount: 10,
        notes: "rls harness fixture",
      })
      .select("id")
      .single();
    if (npErr) throw new Error(`stage note_payments: ${npErr.message}`);
    notePaymentId = np.id as string;

    // A trigger may already have snapshotted payouts for every funded
    // participation on this note; reuse B's row if so, else insert one.
    const { data: existing } = await admin
      .from("participation_payment_payouts")
      .select("id")
      .eq("note_payment_id", notePaymentId)
      .eq("participation_id", partB)
      .maybeSingle();
    if (existing?.id) {
      payoutId = existing.id as string;
    } else {
      const { data: payout, error: payErr } = await admin
        .from("participation_payment_payouts")
        .insert({
          note_payment_id: notePaymentId,
          participation_id: partB,
          principal_amount: 100,
          interest_amount: 10,
          share_basis: 25000,
        })
        .select("id")
        .single();
      if (payErr)
        throw new Error(`stage participation_payment_payouts: ${payErr.message}`);
      payoutId = payout.id as string;
    }

    // 12a. A cannot read B's participation_documents.
    const aChildDocs = await rows(a, "participation_documents", "id", (q) =>
      q.eq("participation_id", partB),
    );
    check(
      aChildDocs.length === 0,
      `A sees 0 participation_documents on B's participation (got ${aChildDocs.length})`,
    );

    // 12b. A cannot read B's payment payouts.
    const aChildPayouts = await rows(
      a,
      "participation_payment_payouts",
      "id",
      (q) => q.eq("participation_id", partB),
    );
    check(
      aChildPayouts.length === 0,
      `A sees 0 participation_payment_payouts on B's participation (got ${aChildPayouts.length})`,
    );

    // Control: B DOES see its own child rows (proves the rows really exist and
    // are reachable through the policy, so 12a/12b aren't vacuous).
    const bChildDocs = await rows(b, "participation_documents", "id", (q) =>
      q.eq("participation_id", partB),
    );
    const bChildPayouts = await rows(
      b,
      "participation_payment_payouts",
      "id",
      (q) => q.eq("participation_id", partB),
    );
    check(
      bChildDocs.length >= 1 && bChildPayouts.length >= 1,
      `CONTROL: B sees its own child rows (docs=${bChildDocs.length}, payouts=${bChildPayouts.length})`,
    );
  } finally {
    // Clean up fixtures (payout cascades from note_payments, but be explicit).
    if (payoutId)
      await admin
        .from("participation_payment_payouts")
        .delete()
        .eq("id", payoutId);
    if (notePaymentId)
      await admin.from("note_payments").delete().eq("id", notePaymentId);
    if (childDocId)
      await admin.from("participation_documents").delete().eq("id", childDocId);
  }

  console.log("");
  console.log(
    failures === 0 ? "RLS ISOLATION PASS" : `RLS ISOLATION FAIL (${failures})`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`❌ ERROR: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
