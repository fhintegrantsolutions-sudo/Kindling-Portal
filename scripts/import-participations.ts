// Bulk-import participations from a CSV.
//
// Usage:
//   npx tsx scripts/import-participations.ts                  # dry-run
//   npx tsx scripts/import-participations.ts --confirm         # write
//   npx tsx scripts/import-participations.ts --file=path.csv   # custom path
//
// CSV columns (header required):
//   note_id            — human identifier, e.g. K24001
//   email              — lender's profile email (must already exist)
//   invested_amount    — number, no commas
//   funding_state      — optional: awaiting | received | deposited | cleared
//                        (default: cleared)
//   funding_type       — optional: wire | check | ach | other
//   funding_cleared_date — optional ISO date (YYYY-MM-DD); used to also set
//                        the received_date and deposited_date
//   notes              — optional free text → user_notes
//
// Lookups are pre-fetched, so rows referencing missing notes or unknown
// emails are reported up-front and skipped.

import { config } from "dotenv";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const FUNDING_STATES = ["awaiting", "received", "deposited", "cleared"] as const;
const FUNDING_TYPES = ["wire", "check", "ach", "other"] as const;

type Row = {
  line: number;
  note_id: string;
  email: string;
  invested_amount: string;
  funding_state: (typeof FUNDING_STATES)[number];
  funding_type: (typeof FUNDING_TYPES)[number] | null;
  funding_cleared_date: string | null;
  notes: string | null;
};

async function main() {
  const dryRun = !process.argv.includes("--confirm");
  const fileArg = process.argv.find((a) => a.startsWith("--file="));
  const path = fileArg
    ? fileArg.slice("--file=".length)
    : "scripts/participations.csv";

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

  // Prefetch lookups
  const noteIds = Array.from(new Set(rows.map((r) => r.note_id)));
  const emails = Array.from(new Set(rows.map((r) => r.email.toLowerCase())));

  const { data: notes } = await admin
    .from("notes")
    .select("id, note_id")
    .in("note_id", noteIds);
  const noteMap = new Map<string, string>(
    (notes ?? []).map((n) => [n.note_id as string, n.id as string]),
  );

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email")
    .in("email", emails);
  const profileMap = new Map<string, string>(
    (profiles ?? []).map((p) => [
      (p.email as string).toLowerCase(),
      p.id as string,
    ]),
  );

  // Build inserts (skip rows missing references)
  const inserts: Record<string, unknown>[] = [];
  const skips: { line: number; reason: string }[] = [];
  for (const r of rows) {
    const noteUuid = noteMap.get(r.note_id);
    const userId = profileMap.get(r.email.toLowerCase());
    if (!noteUuid) {
      skips.push({ line: r.line, reason: `unknown note_id "${r.note_id}"` });
      continue;
    }
    if (!userId) {
      skips.push({ line: r.line, reason: `no profile for email "${r.email}"` });
      continue;
    }
    const flags = fundingFlags(r.funding_state);
    inserts.push({
      note_id: noteUuid,
      user_id: userId,
      invested_amount: r.invested_amount,
      status: "Active",
      user_notes: r.notes,
      funding_received: flags.received,
      funding_deposited: flags.deposited,
      funding_cleared: flags.cleared,
      funding_type: r.funding_type,
      funding_received_date: flags.received ? r.funding_cleared_date : null,
      funding_deposited_date: flags.deposited ? r.funding_cleared_date : null,
      funding_cleared_date: flags.cleared ? r.funding_cleared_date : null,
    });
  }

  console.log(`Prepared ${inserts.length} participation row(s).`);
  if (skips.length > 0) {
    console.log(`Skipped ${skips.length} row(s):`);
    for (const s of skips) console.log(`  line ${s.line}: ${s.reason}`);
  }

  if (dryRun) {
    console.log("\nFirst 3 prepared rows (preview):");
    for (const ins of inserts.slice(0, 3)) {
      console.log("  " + JSON.stringify(ins));
    }
    console.log("\nRe-run with --confirm to execute.\n");
    return;
  }

  if (inserts.length === 0) {
    console.log("Nothing to insert.");
    return;
  }

  // Insert in chunks of 100
  let inserted = 0;
  for (let i = 0; i < inserts.length; i += 100) {
    const chunk = inserts.slice(i, i + 100);
    const { error } = await admin.from("participations").insert(chunk);
    if (error) {
      console.error(
        `\n✗ Failed chunk ${i}-${i + chunk.length}: ${error.message}`,
      );
      console.error(`Inserted ${inserted} before failure.`);
      process.exit(1);
    }
    inserted += chunk.length;
  }
  console.log(`\n✓ Inserted ${inserted} participation row(s).\n`);
}

function fundingFlags(state: (typeof FUNDING_STATES)[number]) {
  return {
    received: state !== "awaiting",
    deposited: state === "deposited" || state === "cleared",
    cleared: state === "cleared",
  };
}

// Minimal CSV parser. Supports quoted fields (`"value, with comma"`),
// double-quote escaping ("" inside quotes → "), and CRLF/LF line endings.
function parseCsv(input: string): {
  rows: Row[];
  errors: { line: number; msg: string }[];
} {
  const lines = splitCsv(input);
  if (lines.length === 0) return { rows: [], errors: [] };
  const header = lines[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const required = ["note_id", "email", "invested_amount"];
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
    if (cells.length === 1 && cells[0] === "") continue; // blank
    const get = (k: string) => {
      const j = idx(k);
      return j === -1 ? "" : (cells[j] ?? "").trim();
    };

    const note_id = get("note_id");
    const email = get("email");
    // Tolerate "$20,000.00" — strip dollar signs and thousands commas.
    const investedRaw = get("invested_amount")
      .replace(/[$,]/g, "")
      .trim();
    if (!note_id || !email || !investedRaw) {
      errors.push({
        line: i + 1,
        msg: "missing note_id, email, or invested_amount",
      });
      continue;
    }
    const investedNum = Number(investedRaw);
    if (!Number.isFinite(investedNum) || investedNum <= 0) {
      errors.push({
        line: i + 1,
        msg: `invested_amount "${investedRaw}" is not a positive number`,
      });
      continue;
    }

    const stateRaw = (get("funding_state") || "cleared").toLowerCase();
    if (!(FUNDING_STATES as readonly string[]).includes(stateRaw)) {
      errors.push({
        line: i + 1,
        msg: `funding_state "${stateRaw}" must be one of ${FUNDING_STATES.join("/")}`,
      });
      continue;
    }
    const state = stateRaw as (typeof FUNDING_STATES)[number];

    const typeRaw = get("funding_type").toLowerCase();
    let type: (typeof FUNDING_TYPES)[number] | null = null;
    if (typeRaw) {
      if (!(FUNDING_TYPES as readonly string[]).includes(typeRaw)) {
        errors.push({
          line: i + 1,
          msg: `funding_type "${typeRaw}" must be one of ${FUNDING_TYPES.join("/")}`,
        });
        continue;
      }
      type = typeRaw as (typeof FUNDING_TYPES)[number];
    }

    const dateRaw = get("funding_cleared_date");
    let date: string | null = null;
    if (dateRaw) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
        errors.push({
          line: i + 1,
          msg: `funding_cleared_date "${dateRaw}" must be YYYY-MM-DD`,
        });
        continue;
      }
      date = dateRaw;
    }

    rows.push({
      line: i + 1,
      note_id,
      email,
      invested_amount: investedRaw,
      funding_state: state,
      funding_type: type,
      funding_cleared_date: date,
      notes: get("notes") || null,
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
      // skip CRLF pair
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
