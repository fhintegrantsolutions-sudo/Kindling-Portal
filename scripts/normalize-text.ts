// One-time pass: normalize person-name fields to Proper Case and emails to
// lowercase across every table that stores them. Idempotent — safe to
// re-run.
//
// Tables / columns touched:
//   profiles         : first_name, last_name, email
//   access_requests  : first_name, last_name, email
//   note_registrations: first_name, last_name, email
//   borrowers        : first_name, last_name, email
//   auth.users       : email                       (via admin API)
//
// NOT touched: business_name, loan_agreement_title, address fields — those
// hold admin-entered casing that may be legally significant (e.g.
// "F and F SDIRA LLC", "CDC Living Trust dated 2 April 2019").
//
// Usage:
//   npx tsx scripts/normalize-text.ts             # dry-run
//   npx tsx scripts/normalize-text.ts --confirm   # write

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

function toProperCase(s: string | null | undefined): string {
  if (!s) return "";
  const trimmed = s.trim();
  if (!trimmed) return "";
  // Mixed-case input (e.g. "McCleary", "JoLea", "FBO Felipe Vazquez ROTH IRA")
  // is left alone — admins legitimately type embedded capitals that the naive
  // lower-then-cap pass would mangle. We only normalize when input is entirely
  // upper or entirely lower, which is the typical data-entry mistake.
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  if (hasUpper && hasLower) return trimmed;
  return trimmed
    .toLowerCase()
    .replace(/(^|[\s\-'\.])([a-z])/g, (_m, sep: string, ch: string) =>
      sep + ch.toUpperCase(),
    );
}

function normalizeEmail(s: string | null | undefined): string {
  if (!s) return "";
  return s.trim().toLowerCase();
}

type NameRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

async function main() {
  const dryRun = !process.argv.includes("--confirm");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\n${dryRun ? "[DRY RUN]" : "[EXECUTING]"} normalize text\n`);

  let totalChanges = 0;

  // 1. profiles
  totalChanges += await normalizeTable(
    admin,
    "profiles",
    "id, first_name, last_name, email",
    dryRun,
  );

  // 2. access_requests
  totalChanges += await normalizeTable(
    admin,
    "access_requests",
    "id, first_name, last_name, email",
    dryRun,
  );

  // 3. note_registrations
  totalChanges += await normalizeTable(
    admin,
    "note_registrations",
    "id, first_name, last_name, email",
    dryRun,
  );

  // 4. borrowers
  totalChanges += await normalizeTable(
    admin,
    "borrowers",
    "id, first_name, last_name, email",
    dryRun,
  );

  // 5. auth.users — only email. The admin API treats email as a top-level
  // attribute; update via updateUserById.
  console.log("\nauth.users:");
  let authChanges = 0;
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    for (const u of data.users) {
      const current = u.email ?? "";
      const next = normalizeEmail(current);
      if (current === next) continue;
      console.log(`  ${u.id}  ${current}  →  ${next}`);
      authChanges++;
      if (!dryRun) {
        const { error: upErr } = await admin.auth.admin.updateUserById(u.id, {
          email: next,
          email_confirm: true,
        });
        if (upErr) console.warn(`    ✗ ${upErr.message}`);
      }
    }
    if (data.users.length < 1000) break;
    page++;
  }
  console.log(`  ${authChanges} auth user email${authChanges === 1 ? "" : "s"} ${dryRun ? "would change" : "updated"}`);
  totalChanges += authChanges;

  console.log(`\n${dryRun ? "[DRY RUN]" : "[DONE]"} ${totalChanges} total changes${dryRun ? " would land. Re-run with --confirm to execute." : "."}\n`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function normalizeTable(
  admin: any,
  table: string,
  selectCols: string,
  dryRun: boolean,
): Promise<number> {
  console.log(`\n${table}:`);
  const { data, error } = await admin.from(table).select(selectCols);
  if (error) {
    console.warn(`  ✗ ${error.message}`);
    return 0;
  }
  const rows = (data ?? []) as unknown as NameRow[];
  let count = 0;
  for (const r of rows) {
    const updates: Record<string, string> = {};
    const newFirst = toProperCase(r.first_name);
    if (r.first_name !== null && newFirst !== r.first_name)
      updates.first_name = newFirst;
    const newLast = toProperCase(r.last_name);
    if (r.last_name !== null && newLast !== r.last_name)
      updates.last_name = newLast;
    const newEmail = normalizeEmail(r.email);
    if (r.email !== null && newEmail !== r.email && newEmail.length > 0)
      updates.email = newEmail;
    if (Object.keys(updates).length === 0) continue;

    count++;
    const before = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
    const after = `${updates.first_name ?? r.first_name ?? ""} ${updates.last_name ?? r.last_name ?? ""}`.trim();
    const emailNote =
      updates.email ? `  · email ${r.email} → ${updates.email}` : "";
    console.log(`  ${r.id.slice(0, 8)}  ${before}  →  ${after}${emailNote}`);

    if (!dryRun) {
      const { error: uErr } = await admin.from(table).update(updates).eq("id", r.id);
      if (uErr) console.warn(`    ✗ ${uErr.message}`);
    }
  }
  console.log(`  ${count} row${count === 1 ? "" : "s"} ${dryRun ? "would change" : "updated"}`);
  return count;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
