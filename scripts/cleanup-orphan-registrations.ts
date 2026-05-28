// Finds note_registrations rows that lack a matching participation
// (user_id, note_id). These are orphans from earlier registration attempts
// that failed at the participation insert step. Dry-run by default.
//
// Usage:
//   npx tsx scripts/cleanup-orphan-registrations.ts
//   npx tsx scripts/cleanup-orphan-registrations.ts --confirm

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

  const { data: regs, error: rErr } = await admin
    .from("note_registrations")
    .select("id, note_id, user_id, email, first_name, last_name, created_at");
  if (rErr) throw new Error(rErr.message);

  const { data: parts, error: pErr } = await admin
    .from("participations")
    .select("note_id, user_id");
  if (pErr) throw new Error(pErr.message);

  const partKeys = new Set(
    (parts ?? []).map(
      (p) => `${p.user_id as string}::${p.note_id as string}`,
    ),
  );

  const orphans = (regs ?? []).filter(
    (r) =>
      r.user_id &&
      !partKeys.has(`${r.user_id as string}::${r.note_id as string}`),
  );

  console.log(`\n${dryRun ? "[DRY RUN]" : "[EXECUTING]"} orphan registrations\n`);
  if (orphans.length === 0) {
    console.log("None found.\n");
    return;
  }
  for (const o of orphans) {
    console.log(
      `  ${o.id.slice(0, 8)}  ${o.first_name ?? ""} ${o.last_name ?? ""}  <${o.email ?? "no email"}>  note=${o.note_id}`,
    );
  }
  console.log(`\n${orphans.length} orphan${orphans.length === 1 ? "" : "s"}\n`);

  if (dryRun) {
    console.log("Re-run with --confirm to delete them.\n");
    return;
  }

  const ids = orphans.map((o) => o.id);
  const { error: delErr } = await admin
    .from("note_registrations")
    .delete()
    .in("id", ids);
  if (delErr) throw new Error(delErr.message);
  console.log(`Deleted ${ids.length} orphan note_registration${ids.length === 1 ? "" : "s"}.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
