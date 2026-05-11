// Destructive: wipes every domain table and deletes every auth user except
// the admin we want to keep. Run dry-run first to preview the counts:
//
//   npx tsx scripts/wipe-data.ts
//
// To actually execute the wipe:
//
//   npx tsx scripts/wipe-data.ts --confirm
//
// Connects via SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const KEEP_EMAIL = "fhintegrantsolutions@gmail.com";
const SENTINEL_UUID = "00000000-0000-0000-0000-000000000000";

// Order matters — children before parents to satisfy FK constraints.
// participations has user_id ON DELETE RESTRICT, so it must go before any
// auth user delete. Cascade-children of participations (payouts, payments,
// bonuses, registrations) come first.
const DOMAIN_TABLES = [
  "participation_bonus_payouts",
  "participation_payment_payouts",
  "note_bonuses",
  "note_payments",
  "participation_documents",
  "documents",
  "beneficiaries",
  "activities",
  "note_registrations",
  "participations",
  "note_visibility",
  "notes",
  "borrowers",
  "access_requests",
  "referrals",
  "referral_codes",
  "audit_logs",
] as const;

async function main() {
  const dryRun = !process.argv.includes("--confirm");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local",
    );
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(
    `\n${dryRun ? "[DRY RUN]" : "[EXECUTING]"} wipe data, keep ${KEEP_EMAIL}\n`,
  );

  // 1. Sanity check — confirm the keeper exists.
  const { data: keeperUsers } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const keeper = keeperUsers.users.find((u) => u.email === KEEP_EMAIL);
  if (!keeper) {
    throw new Error(
      `Aborting: no auth user with email ${KEEP_EMAIL}. Refusing to wipe.`,
    );
  }
  console.log(`✓ keeper found: ${keeper.id} (${keeper.email})\n`);

  // 2. Domain tables — count, then delete every row.
  console.log("Domain tables:");
  for (const t of DOMAIN_TABLES) {
    const { count: before, error: ce } = await admin
      .from(t)
      .select("*", { count: "exact", head: true });
    if (ce) {
      console.log(`  ${t.padEnd(32)} (skip — ${ce.message})`);
      continue;
    }
    if (dryRun) {
      console.log(`  ${t.padEnd(32)} ${before ?? 0} rows`);
      continue;
    }
    const { error: de, count: deleted } = await admin
      .from(t)
      .delete({ count: "exact" })
      .neq("id", SENTINEL_UUID);
    if (de) {
      console.log(`  ${t.padEnd(32)} ✗ ${de.message}`);
      continue;
    }
    console.log(`  ${t.padEnd(32)} deleted ${deleted ?? 0}`);
  }

  // 3. Auth users — list + delete each one that isn't the keeper. Profiles
  // cascade-delete via the FK; same for any user-owned rows we missed.
  console.log("\nAuth users:");
  const { data: usersPage } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const toDelete = usersPage.users.filter((u) => u.id !== keeper.id);
  if (toDelete.length === 0) {
    console.log("  (no other users)");
  } else if (dryRun) {
    for (const u of toDelete) {
      console.log(`  would delete  ${u.id}  ${u.email ?? "(no email)"}`);
    }
  } else {
    for (const u of toDelete) {
      const { error: ude } = await admin.auth.admin.deleteUser(u.id);
      console.log(
        `  ${ude ? "✗" : "✓"} delete  ${u.id}  ${u.email ?? "(no email)"}` +
          (ude ? `  — ${ude.message}` : ""),
      );
    }
  }

  console.log(
    `\n${dryRun ? "Dry run complete. Re-run with --confirm to execute." : "Wipe complete."}\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
