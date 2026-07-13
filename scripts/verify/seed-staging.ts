/**
 * Seed the STAGING database with realistic POST-migration data.
 *
 * `profiles` now holds only login-level fields; the entity identity lives on
 * `investor_entities`. This seed therefore creates one primary entity per user
 * directly (mirroring exactly what the backfill migration used to produce,
 * including its display_name rule) and populates `entity_id` on every
 * entity-scoped row. The backfill migration is no longer runnable — the flat
 * `profiles` columns it read were dropped in
 * 20260712000003_profiles_drop_entity_cols.sql.
 *
 * Idempotent: it deletes and recreates its own auth users (cascade removes
 * their profiles/participations/beneficiaries/documents/visibility/entities)
 * and its own two seed notes, then inserts fresh.
 *
 * Guard rails: refuses to run unless STAGING_* is set in .env.staging, and
 * refuses if the staging URL matches the REAL project ref from .env.local.
 *
 * Usage:
 *   npx tsx scripts/verify/seed-staging.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

const staging = config({ path: ".env.staging" }).parsed ?? {};
const real = config({ path: ".env.local", override: false }).parsed ?? {};

const STAGING_URL = staging.STAGING_SUPABASE_URL;
const SERVICE_ROLE = staging.STAGING_SERVICE_ROLE_KEY;
const DB_URL = staging.STAGING_DB_URL;

if (!STAGING_URL || !SERVICE_ROLE || !DB_URL) {
  console.error(
    "Missing STAGING_SUPABASE_URL / STAGING_SERVICE_ROLE_KEY / STAGING_DB_URL in .env.staging — refusing to run.",
  );
  process.exit(1);
}

// Safety: never let this point at the real project.
const realRef = (real.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace("https://", "")
  .split(".")[0];
if (realRef && (STAGING_URL.includes(realRef) || DB_URL.includes(realRef))) {
  console.error(
    `🛑 ABORT: staging config references the REAL project ref (${realRef}). Refusing to run.`,
  );
  process.exit(1);
}

const SEED_USERS = [
  {
    email: "rls-a@example.com",
    password: "Test-pass-A1!",
    // login-level fields — these still live on `profiles`
    profile: {
      first_name: "Ada",
      last_name: "Alpha",
      phone: "512-555-0100",
    },
    // entity identity — now lives on `investor_entities`
    entity: {
      entity_type: "Individual" as string | null,
      business_name: null as string | null,
      loan_agreement_title: "Ada Alpha",
      address_street: "100 A St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
  },
  {
    email: "rls-b@example.com",
    password: "Test-pass-B1!",
    profile: {
      first_name: "Ben",
      last_name: "Beta",
      phone: "617-555-0200",
    },
    entity: {
      entity_type: "LLC" as string | null,
      business_name: "Beta Holdings LLC" as string | null,
      loan_agreement_title: "Beta Holdings LLC",
      address_street: "200 B Ave",
      address_city: "Boston",
      address_state: "MA",
      address_zip: "02101",
    },
  },
];

/**
 * The backfill migration's display_name rule, reproduced verbatim:
 * business_name if non-empty, else "Personal" for Individual/null entity_type,
 * else the entity_type label.
 */
function displayName(e: (typeof SEED_USERS)[number]["entity"]): string {
  const business = (e.business_name ?? "").trim();
  if (business) return business;
  if (e.entity_type === null || e.entity_type === "Individual") return "Personal";
  return e.entity_type;
}

// Seed notes are matched/cleaned by their human note_id.
const PUBLIC_NOTE_ID = "SEED-PUB-001";
const PRIVATE_NOTE_ID = "SEED-PRV-001";

const supabase = createClient(STAGING_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Clear rows that would block deleting the seed auth users.
 *
 * Most user_id FKs are ON DELETE CASCADE, but participations.user_id is
 * ON DELETE RESTRICT — so its rows must go first or auth.admin.deleteUser
 * fails with "Database error deleting user". Seed notes are dropped here too.
 */
async function clearBlockingRows(pg: Client) {
  const emails = SEED_USERS.map((u) => u.email);
  const res = await pg.query(
    `delete from public.participations
      where user_id in (select id from public.profiles where email = any($1::text[]))`,
    [emails],
  );
  await pg.query(`delete from public.notes where note_id = any($1::text[])`, [
    [PUBLIC_NOTE_ID, PRIVATE_NOTE_ID],
  ]);
  if (res.rowCount) {
    console.log(`  cleared ${res.rowCount} existing seed participation(s)`);
  }
}

/** Delete any pre-existing seed auth users so the run is idempotent. */
async function resetAuthUsers() {
  const emails = new Set(SEED_USERS.map((u) => u.email));
  // listUsers is paginated; walk until we've seen everything.
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    if (!data.users.length) break;
    for (const u of data.users) {
      if (u.email && emails.has(u.email)) {
        const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
        if (delErr) throw delErr;
        console.log(`  removed existing auth user ${u.email}`);
      }
    }
    if (data.users.length < 200) break;
  }
}

async function createAuthUsers(): Promise<string[]> {
  const ids: string[] = [];
  for (const u of SEED_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error) throw error;
    ids.push(data.user.id);
    console.log(`  created auth user ${u.email} -> ${data.user.id}`);
  }
  return ids;
}

async function main() {
  console.log(`Seeding STAGING (${STAGING_URL})`);

  const pg = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();

  let userA: string;
  let userB: string;
  try {
    console.log("\n[1/4] clearing rows that block user deletion…");
    await clearBlockingRows(pg);

    console.log("[2/4] resetting seed auth users…");
    await resetAuthUsers();

    console.log("[3/4] creating auth users…");
    [userA, userB] = await createAuthUsers();

    console.log("[4/4] seeding domain rows…");
    await pg.query("begin");

    // --- profiles (login-level fields only) ------------------------------
    // The on_auth_user_created trigger already inserted a row for each user,
    // so UPDATE rather than INSERT (avoids a duplicate-PK failure).
    for (const [i, uid] of [userA, userB].entries()) {
      const p = SEED_USERS[i].profile;
      const res = await pg.query(
        `update public.profiles set
           first_name = $2, last_name = $3, phone = $4
         where id = $1`,
        [uid, p.first_name, p.last_name, p.phone],
      );
      if (res.rowCount !== 1) {
        throw new Error(
          `expected the on_auth_user_created trigger to have created a profiles row for ${uid}, updated ${res.rowCount}`,
        );
      }
    }

    // --- investor_entities (one primary entity per login) ------------------
    // What the backfill migration used to produce, written directly.
    const entityIds: string[] = [];
    for (const [i, uid] of [userA, userB].entries()) {
      const e = SEED_USERS[i].entity;
      const res = await pg.query(
        `insert into public.investor_entities
           (owner_user_id, display_name, entity_type, business_name,
            loan_agreement_title, address_street, address_city, address_state,
            address_zip, is_primary)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
         returning id`,
        [
          uid,
          displayName(e),
          e.entity_type,
          e.business_name,
          e.loan_agreement_title,
          e.address_street,
          e.address_city,
          e.address_state,
          e.address_zip,
        ],
      );
      entityIds.push(res.rows[0].id as string);
    }
    const [entityA, entityB] = entityIds;

    // User A also gets a SECOND (non-primary) entity, so the fixture exercises a
    // genuinely multi-entity login. The RLS harness asserts A sees positions
    // across BOTH entities — without this, that assertion goes vacuous.
    const secondA = await pg.query(
      `insert into public.investor_entities
         (owner_user_id, display_name, entity_type, business_name,
          loan_agreement_title, is_primary)
       values ($1, 'Alpha Holdings LLC', 'LLC', 'Alpha Holdings LLC',
               'Alpha Holdings LLC', false)
       returning id`,
      [userA],
    );
    const entityA2 = secondA.rows[0].id as string;
    entityIds.push(entityA2);

    // --- notes (one public, one private) --------------------------------
    const notes = await pg.query(
      `insert into public.notes
         (note_id, title, principal, rate, term_months, project_type, type,
          interest_type, status, client_status, is_private, description)
       values
         ($1, 'Seed Public Note', 250000, 9.5, 24, 'Bridge Loan',
          'Participation', 'Amortized', 'Active', 'Available', false,
          'Public seed note for staging verification.'),
         ($2, 'Seed Private Note', 500000, 11.0, 36, 'Construction',
          'Participation', 'Interest Only', 'Active', 'Available', true,
          'Private seed note — visible only via note_visibility.')
       returning id, note_id, is_private`,
      [PUBLIC_NOTE_ID, PRIVATE_NOTE_ID],
    );
    const publicNote = notes.rows.find((r) => r.note_id === PUBLIC_NOTE_ID).id;
    const privateNote = notes.rows.find((r) => r.note_id === PRIVATE_NOTE_ID).id;

    // --- participations (2 for A, 1 for B) — entity_id populated ---------
    const parts = await pg.query(
      `insert into public.participations
         (user_id, entity_id, note_id, invested_amount, status, funding_received)
       values
         ($1, $5, $3, 50000, 'Active', true),
         ($1, $5, $4, 75000, 'Active', true),
         ($2, $6, $3, 25000, 'Active', false)
       returning id`,
      [userA, userB, publicNote, privateNote, entityA, entityB],
    );

    // --- beneficiaries (1 each) — entity_id populated ---------------------
    const bene = await pg.query(
      `insert into public.beneficiaries
         (user_id, entity_id, name, relation, percentage, type, phone, ssn_last4)
       values
         ($1, $3, 'Alice Alpha', 'Spouse', 100, 'Primary', '512-555-0101', '1234'),
         ($2, $4, 'Bella Beta', 'Child', 100, 'Primary', '617-555-0201', '5678')
       returning id`,
      [userA, userB, entityA, entityB],
    );

    // --- documents (1 for A) — entity_id populated ------------------------
    const docs = await pg.query(
      `insert into public.documents
         (user_id, entity_id, type, file_name, file_url, status)
       values ($1, $2, 'W-9', 'ada-alpha-w9.pdf',
               'https://staging.example/seed/ada-alpha-w9.pdf', 'Approved')
       returning id`,
      [userA, entityA],
    );

    // --- note_visibility (A can see the PRIVATE note) — entity_id populated
    // Composite PK (note_id, user_id): no id column.
    const vis = await pg.query(
      `insert into public.note_visibility (note_id, user_id, entity_id)
       values ($1, $2, $3)
       on conflict (note_id, user_id) do nothing
       returning note_id`,
      [privateNote, userA, entityA],
    );

    await pg.query("commit");

    console.log("\n✅ staging seed complete");
    console.log("─".repeat(62));
    console.log(`  user A  rls-a@example.com  ${userA}  (Ada Alpha, Individual)`);
    console.log(
      `  user B  rls-b@example.com  ${userB}  (Ben Beta, Beta Holdings LLC)`,
    );
    console.log("─".repeat(62));
    console.log(`  profiles updated      2`);
    console.log(`  investor_entities     ${entityIds.length} (1 primary each; A also has a 2nd, non-primary)`);
    console.log(
      `  notes inserted        ${notes.rowCount} (1 public, 1 private)`,
    );
    console.log(`  participations        ${parts.rowCount} (2 for A, 1 for B)`);
    console.log(`  beneficiaries         ${bene.rowCount}`);
    console.log(`  documents             ${docs.rowCount}`);
    console.log(`  note_visibility       ${vis.rowCount} (A → private note)`);
    console.log("─".repeat(62));
    console.log("  entity_id is populated on every row — no backfill needed.");
  } catch (e) {
    await pg.query("rollback").catch(() => {});
    throw e;
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(`❌ seed FAILED: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
