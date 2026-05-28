// Finds participations whose invested_amount is below the note's
// min_investment. Skips any participation where funding has already been
// touched (received / deposited / cleared) — those represent real money
// flow and need a manual decision. Also removes the paired
// note_registration row (same user_id + note_id) so the audit log stays
// consistent.
//
// Usage:
//   npx tsx scripts/cleanup-below-min-participations.ts
//   npx tsx scripts/cleanup-below-min-participations.ts --confirm

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const dryRun = !process.argv.includes("--confirm");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local",
    );
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: parts, error: pErr } = await admin
    .from("participations")
    .select(
      `id, user_id, note_id, invested_amount,
       funding_received, funding_deposited, funding_cleared,
       note:notes ( note_id, min_investment )`,
    );
  if (pErr) throw new Error(pErr.message);

  type Row = {
    id: string;
    user_id: string;
    note_id: string;
    invested_amount: string;
    funding_received: boolean;
    funding_deposited: boolean;
    funding_cleared: boolean;
    note: { note_id: string; min_investment: string | null } | null;
  };

  const below: Row[] = [];
  for (const r of (parts ?? []) as unknown as Row[]) {
    const min = r.note?.min_investment ? Number(r.note.min_investment) : 0;
    const amt = Number(r.invested_amount);
    if (min <= 0) continue;
    if (amt >= min) continue;
    if (r.funding_received || r.funding_deposited || r.funding_cleared) {
      console.warn(
        `  ! Skipping ${r.id.slice(0, 8)} (${r.note?.note_id ?? "?"}) — funding already in motion; needs manual review`,
      );
      continue;
    }
    below.push(r);
  }

  console.log(
    `\n${dryRun ? "[DRY RUN]" : "[EXECUTING]"} participations below min_investment\n`,
  );
  if (below.length === 0) {
    console.log("None found.\n");
    return;
  }
  for (const r of below) {
    const min = Number(r.note?.min_investment ?? 0);
    console.log(
      `  ${r.id.slice(0, 8)}  ${r.note?.note_id ?? "?"}  $${Number(r.invested_amount).toLocaleString()} < min $${min.toLocaleString()}  user=${r.user_id.slice(0, 8)}`,
    );
  }
  console.log(
    `\n${below.length} participation${below.length === 1 ? "" : "s"}\n`,
  );

  if (dryRun) {
    console.log("Re-run with --confirm to delete them.\n");
    return;
  }

  const partIds = below.map((r) => r.id);
  const { error: delPartErr } = await admin
    .from("participations")
    .delete()
    .in("id", partIds);
  if (delPartErr) throw new Error(delPartErr.message);

  // Remove the paired note_registration row(s) keyed by (user_id, note_id).
  let regDeleted = 0;
  for (const r of below) {
    const { error: delRegErr, count } = await admin
      .from("note_registrations")
      .delete({ count: "exact" })
      .eq("user_id", r.user_id)
      .eq("note_id", r.note_id);
    if (delRegErr) {
      console.warn(
        `  ! Failed to delete registration for ${r.user_id.slice(0, 8)}/${r.note?.note_id}: ${delRegErr.message}`,
      );
    } else {
      regDeleted += count ?? 0;
    }
  }

  console.log(
    `Deleted ${partIds.length} participation${partIds.length === 1 ? "" : "s"} + ${regDeleted} matching note_registration${regDeleted === 1 ? "" : "s"}.\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
