// Bulk-import lenders (auth users + profiles) from a CSV.
//
// Usage:
//   npx tsx scripts/import-users.ts                  # dry-run
//   npx tsx scripts/import-users.ts --confirm        # write
//   npx tsx scripts/import-users.ts --file=path.csv  # custom path
//
// CSV columns (header required):
//   email                 — required; auth account is keyed off this
//   first_name            — required
//   last_name             — required
//   phone                 — recommended
//   address_street        — optional
//   address_city          — optional
//   address_state         — optional
//   address_zip           — optional
//   entity_type           — optional
//   business_name         — optional (recommended for non-Individual entities)
//   loan_agreement_title  — optional
//   role                  — optional (admin | lender, default lender)
//   send_invite           — optional (true|yes|1 to queue a password-reset
//                           email so the lender can pick their own password).
//                           Be aware of Supabase's 4-emails-per-hour cap on
//                           the free tier — bulk-inviting many users will
//                           hit the limit; mark only a few as true if you
//                           plan to test.
//
// Behavior:
//   - If a user already exists with that email, the auth account is left
//     alone and only the profile is updated (idempotent re-runs are safe).
//   - Otherwise a new auth user is created with a random temporary password
//     and the profile is hydrated.
//   - send_invite=true → triggers Supabase's password-reset email so the
//     user can set their own password.

import { config } from "dotenv";
import { readFileSync } from "fs";
import { createClient, type User } from "@supabase/supabase-js";

config({ path: ".env.local" });

type Row = {
  line: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  entity_type: string | null;
  business_name: string | null;
  loan_agreement_title: string | null;
  role: "admin" | "lender";
  send_invite: boolean;
};

async function main() {
  const dryRun = !process.argv.includes("--confirm");
  const fileArg = process.argv.find((a) => a.startsWith("--file="));
  const path = fileArg
    ? fileArg.slice("--file=".length)
    : "scripts/users.csv";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local",
    );
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\n${dryRun ? "[DRY RUN]" : "[EXECUTING]"} from ${path}\n`);

  const csv = readFileSync(path, "utf8");
  const { rows, errors: parseErrors } = parseCsv(csv);
  for (const e of parseErrors) console.warn(`  ! line ${e.line}: ${e.msg}`);
  if (rows.length === 0) {
    console.log("No valid rows in CSV — nothing to do.");
    return;
  }

  // Pre-fetch existing auth users so we can mark which rows are new vs
  // updates. listUsers returns up to perPage at a time; bump page count if
  // your user base grows past 1000.
  const existing = new Map<string, User>();
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email) existing.set(u.email.toLowerCase(), u);
    }
    if (data.users.length < 1000) break;
    page++;
  }

  console.log(`Parsed ${rows.length} row(s); ${existing.size} existing auth users.\n`);

  if (dryRun) {
    for (const r of rows) {
      const e = existing.get(r.email.toLowerCase());
      const action = e ? "update profile" : "create auth + profile";
      const invite = r.send_invite ? "  (will send password-reset email)" : "";
      console.log(
        `  line ${r.line}  ${action.padEnd(24)}  ${r.email}  ${r.first_name} ${r.last_name}${invite}`,
      );
    }
    console.log("\nRe-run with --confirm to execute.\n");
    return;
  }

  let created = 0;
  let updated = 0;
  let invited = 0;
  let failed = 0;
  for (const r of rows) {
    let userId: string | null = null;
    const existingUser = existing.get(r.email.toLowerCase());

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: r.email,
        password: randomPassword(),
        email_confirm: true,
        user_metadata: { imported: true },
      });
      if (error || !data.user) {
        console.warn(
          `  ✗ line ${r.line} create failed for ${r.email}: ${error?.message ?? "no user"}`,
        );
        failed++;
        continue;
      }
      userId = data.user.id;
      // Track the freshly-created user so subsequent CSV rows that point at
      // the same email update the profile rather than try to create again.
      existing.set(r.email.toLowerCase(), data.user);
      created++;
    }

    // Build the update dynamically: required fields (first_name, last_name,
    // role) always go in; everything else is included only when the CSV row
    // has a non-null value, so a blank cell preserves whatever's already
    // on the existing profile.
    const update: Record<string, unknown> = {
      first_name: r.first_name,
      last_name: r.last_name,
      role: r.role,
    };
    if (r.phone !== null) update.phone = r.phone;
    if (r.address_street !== null) update.address_street = r.address_street;
    if (r.address_city !== null) update.address_city = r.address_city;
    if (r.address_state !== null) update.address_state = r.address_state;
    if (r.address_zip !== null) update.address_zip = r.address_zip;
    if (r.entity_type !== null) update.entity_type = r.entity_type;
    if (r.business_name !== null) update.business_name = r.business_name;
    if (r.loan_agreement_title !== null)
      update.loan_agreement_title = r.loan_agreement_title;

    const { error: pErr } = await admin
      .from("profiles")
      .update(update)
      .eq("id", userId);
    if (pErr) {
      console.warn(
        `  ✗ line ${r.line} profile update failed for ${r.email}: ${pErr.message}`,
      );
      failed++;
      continue;
    }
    if (existingUser) updated++;

    if (r.send_invite) {
      const { error: invErr } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: r.email,
      });
      if (invErr) {
        console.warn(
          `  ! line ${r.line} invite failed for ${r.email}: ${invErr.message}`,
        );
      } else {
        invited++;
      }
    }
  }

  console.log(
    `\n✓ Done. created=${created} updated=${updated} invited=${invited} failed=${failed}\n`,
  );
}

// Display normalization helpers (kept inline so the script is self-contained
// without reaching into src/ — the matching server-side versions live in
// src/lib/text.ts and use the same algorithm).
function toProperCase(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  // Skip mixed-case input to preserve names like "McCleary" / "JoLea".
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  if (hasUpper && hasLower) return trimmed;
  return trimmed
    .toLowerCase()
    .replace(/(^|[\s\-'\.])([a-z])/g, (_m, sep: string, ch: string) =>
      sep + ch.toUpperCase(),
    );
}

function randomPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  return Array.from(
    { length: 32 },
    () => chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
}

// CSV parser — same shape as import-participations.ts
function parseCsv(input: string): {
  rows: Row[];
  errors: { line: number; msg: string }[];
} {
  const lines = splitCsv(input);
  if (lines.length === 0) return { rows: [], errors: [] };
  const header = lines[0].map((h) => h.trim().toLowerCase());
  const idx = (n: string) => header.indexOf(n);
  const required = ["email", "first_name", "last_name"];
  const errors: { line: number; msg: string }[] = [];
  for (const r of required) {
    if (idx(r) === -1) {
      errors.push({ line: 1, msg: `missing required column "${r}"` });
    }
  }
  if (errors.length > 0) return { rows: [], errors };

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i];
    if (cells.length === 1 && cells[0] === "") continue;
    const get = (k: string) => {
      const j = idx(k);
      return j === -1 ? "" : (cells[j] ?? "").trim();
    };
    const opt = (k: string) => get(k) || null;

    const email = get("email");
    const first_name = get("first_name");
    const last_name = get("last_name");
    if (!email || !first_name || !last_name) {
      errors.push({
        line: i + 1,
        msg: "missing email, first_name, or last_name",
      });
      continue;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.push({ line: i + 1, msg: `email "${email}" is not valid` });
      continue;
    }

    const roleRaw = (get("role") || "lender").toLowerCase();
    if (roleRaw !== "admin" && roleRaw !== "lender") {
      errors.push({
        line: i + 1,
        msg: `role "${roleRaw}" must be admin or lender`,
      });
      continue;
    }

    const inviteRaw = get("send_invite").toLowerCase();
    const send_invite =
      inviteRaw === "true" || inviteRaw === "yes" || inviteRaw === "1";

    // Normalize at import: emails lowercased, names title-cased.
    rows.push({
      line: i + 1,
      email: email.toLowerCase(),
      first_name: toProperCase(first_name),
      last_name: toProperCase(last_name),
      phone: opt("phone"),
      address_street: opt("address_street"),
      address_city: opt("address_city"),
      address_state: opt("address_state"),
      address_zip: opt("address_zip"),
      entity_type: opt("entity_type"),
      business_name: opt("business_name"),
      loan_agreement_title: opt("loan_agreement_title"),
      role: roleRaw as "admin" | "lender",
      send_invite,
    });
  }
  return { rows, errors };
}

function splitCsv(input: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      row.push(cell);
      cell = "";
      out.push(row);
      row = [];
      if (ch === "\r" && input[i + 1] === "\n") i++;
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    out.push(row);
  }
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
