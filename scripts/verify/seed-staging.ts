/**
 * Seed the STAGING database with realistic PRE-migration (flat-profile) data.
 *
 * Shape produced here deliberately mirrors the world BEFORE investor_entities
 * exists: entity identity lives in flat columns on `profiles`, and every
 * entity-scoped row carries `user_id` with `entity_id` left NULL. The backfill
 * migration (20260712000001_investor_entities_backfill.sql) is what fills
 * `entity_id` in — so re-running this seed puts you back to the pre-backfill
 * state for those rows.
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
    profile: {
      first_name: "Ada",
      last_name: "Alpha",
      phone: "512-555-0100",
      entity_type: "Individual",
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
      entity_type: "LLC",
      business_name: "Beta Holdings LLC" as string | null,
      loan_agreement_title: "Beta Holdings LLC",
      address_street: "200 B Ave",
      address_city: "Boston",
      address_state: "MA",
      address_zip: "02101",
    },
  },
];

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

    // --- profiles ------------------------------------------------------
    // The on_auth_user_created trigger already inserted a row for each user,
    // so UPDATE rather than INSERT (avoids a duplicate-PK failure).
    for (const [i, uid] of [userA, userB].entries()) {
      const p = SEED_USERS[i].profile;
      const res = await pg.query(
        `update public.profiles set
           first_name = $2, last_name = $3, phone = $4,
           entity_type = $5, business_name = $6, loan_agreement_title = $7,
           address_street = $8, address_city = $9, address_state = $10,
           address_zip = $11
         where id = $1`,
        [
          uid,
          p.first_name,
          p.last_name,
          p.phone,
          p.entity_type,
          p.business_name,
          p.loan_agreement_title,
          p.address_street,
          p.address_city,
          p.address_state,
          p.address_zip,
        ],
      );
      if (res.rowCount !== 1) {
        throw new Error(
          `expected the on_auth_user_created trigger to have created a profiles row for ${uid}, updated ${res.rowCount}`,
        );
      }
    }

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

    // --- participations (2 for A, 1 for B) — entity_id stays NULL --------
    const parts = await pg.query(
      `insert into public.participations
         (user_id, note_id, invested_amount, status, funding_received)
       values
         ($1, $3, 50000, 'Active', true),
         ($1, $4, 75000, 'Active', true),
         ($2, $3, 25000, 'Active', false)
       returning id`,
      [userA, userB, publicNote, privateNote],
    );

    // --- beneficiaries (1 each) — entity_id stays NULL -------------------
    const bene = await pg.query(
      `insert into public.beneficiaries
         (user_id, name, relation, percentage, type, phone, ssn_last4)
       values
         ($1, 'Alice Alpha', 'Spouse', 100, 'Primary', '512-555-0101', '1234'),
         ($2, 'Bella Beta', 'Child', 100, 'Primary', '617-555-0201', '5678')
       returning id`,
      [userA, userB],
    );

    // --- documents (1 for A) — entity_id stays NULL ----------------------
    const docs = await pg.query(
      `insert into public.documents
         (user_id, type, file_name, file_url, status)
       values ($1, 'W-9', 'ada-alpha-w9.pdf',
               'https://staging.example/seed/ada-alpha-w9.pdf', 'Approved')
       returning id`,
      [userA],
    );

    // --- note_visibility (A can see the PRIVATE note) — entity_id NULL ----
    // Composite PK (note_id, user_id): no id column.
    const vis = await pg.query(
      `insert into public.note_visibility (note_id, user_id)
       values ($1, $2)
       on conflict (note_id, user_id) do nothing
       returning note_id`,
      [privateNote, userA],
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
    console.log(
      `  notes inserted        ${notes.rowCount} (1 public, 1 private)`,
    );
    console.log(`  participations        ${parts.rowCount} (2 for A, 1 for B)`);
    console.log(`  beneficiaries         ${bene.rowCount}`);
    console.log(`  documents             ${docs.rowCount}`);
    console.log(`  note_visibility       ${vis.rowCount} (A → private note)`);
    console.log("─".repeat(62));
    console.log("  entity_id is NULL on every row — run the backfill next.");
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
