#!/usr/bin/env node
/**
 * Firestore → Postgres data migration.
 *
 * Run via:
 *   npx tsx scripts/migrate-from-firestore --dry-run
 *   npx tsx scripts/migrate-from-firestore --truncate --send-resets
 *
 * Flags:
 *   --truncate       wipe domain tables (NOT auth.users) before inserting
 *   --send-resets    after migrating users, trigger Supabase password-reset
 *                    emails so users set their own password
 *   --dry-run        connect, count source docs, print plan, don't write
 *
 * See README.md in this directory for the full runbook.
 */

import "dotenv/config";
import { getFirestoreClient, getSupabaseAdminClient } from "./clients";
import { IdMap } from "./helpers";
import {
  migrateUsers,
  migrateBorrowers,
  migrateNotes,
  migrateNoteRegistrations,
  migrateParticipations,
  migratePayments,
  migrateBeneficiaries,
  migrateDocuments,
  migrateParticipationDocuments,
  migrateAccessRequests,
  migrateReferralCodes,
  migrateReferrals,
  truncateDomainTables,
} from "./migrations";

const COLLECTIONS = [
  "users",
  "borrowers",
  "notes",
  "note_registrations",
  "participations",
  "payments",
  "beneficiaries",
  "documents",
  "participation_documents",
  "access_requests",
  "referrals",
] as const;

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const truncate = args.has("--truncate");
  const sendResets = args.has("--send-resets");

  const firestore = getFirestoreClient();
  const supabase = getSupabaseAdminClient();

  console.log("===  Firestore → Postgres migration  ===");
  console.log(`mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`truncate first: ${truncate}`);
  console.log(`send password-reset emails: ${sendResets}`);
  console.log("");

  // Source-side audit
  console.log("Source counts (Firestore):");
  for (const c of COLLECTIONS) {
    const snap = await firestore.collection(c).count().get();
    console.log(`  ${c.padEnd(24)} ${snap.data().count}`);
  }
  console.log("");

  if (dryRun) {
    console.log("Dry run complete. No writes performed.");
    return;
  }

  if (truncate) {
    console.log("Truncating domain tables…");
    await truncateDomainTables(supabase);
    console.log("  done.");
    console.log("");
  }

  const idMap = new IdMap();

  console.log("Migrating in dependency order…");

  console.log("• users");
  const u = await migrateUsers(firestore, supabase, idMap, {
    sendPasswordResetEmails: sendResets,
  });
  console.log(`  created ${u.created}, skipped ${u.skipped}`);

  console.log("• borrowers");
  const b = await migrateBorrowers(firestore, supabase, idMap);
  console.log(`  inserted ${b}`);

  console.log("• notes");
  const n = await migrateNotes(firestore, supabase, idMap);
  console.log(`  inserted ${n}`);

  console.log("• note_registrations");
  const nr = await migrateNoteRegistrations(firestore, supabase, idMap);
  console.log(`  inserted ${nr}`);

  console.log("• participations");
  const p = await migrateParticipations(firestore, supabase, idMap);
  console.log(`  inserted ${p}`);

  console.log("• payments");
  const pay = await migratePayments(firestore, supabase, idMap);
  console.log(`  inserted ${pay}`);

  console.log("• beneficiaries");
  const ben = await migrateBeneficiaries(firestore, supabase, idMap);
  console.log(`  inserted ${ben}`);

  console.log("• documents");
  const d = await migrateDocuments(firestore, supabase, idMap);
  console.log(`  inserted ${d}`);

  console.log("• participation_documents");
  const pd = await migrateParticipationDocuments(firestore, supabase, idMap);
  console.log(`  inserted ${pd}`);

  console.log("• access_requests");
  const ar = await migrateAccessRequests(firestore, supabase);
  console.log(`  inserted ${ar}`);

  console.log("• referral_codes");
  const rc = await migrateReferralCodes(firestore, supabase, idMap);
  console.log(`  inserted ${rc}`);

  console.log("• referrals");
  const r = await migrateReferrals(firestore, supabase, idMap);
  console.log(`  inserted ${r}`);

  console.log("");
  console.log("Done.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
