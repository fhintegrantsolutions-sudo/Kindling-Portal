// Fetch records from an Airtable table. Read-only — prints the field shape
// and a sample of records so we can confirm the mapping before writing
// anything to Supabase.
//
// Usage:
//   npx tsx scripts/airtable-fetch.ts "Lender Packet"
//   npx tsx scripts/airtable-fetch.ts "Lender Packet" K26002
//
// Reads AIRTABLE_API_KEY and AIRTABLE_BASE_ID from .env.local.

import { config } from "dotenv";

config({ path: ".env.local" });

const tableName = process.argv[2];
const noteFilter = process.argv[3];

if (!tableName) {
  console.error('Usage: npx tsx scripts/airtable-fetch.ts "<table>" [noteId]');
  process.exit(1);
}

// Accept either AIRTABLE_TOKEN_KEY (the personal-access-token name) or
// AIRTABLE_API_KEY (older legacy-key name) so the script doesn't care.
const apiKey =
  process.env.AIRTABLE_TOKEN_KEY ?? process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
if (!apiKey || !baseId) {
  console.error(
    "AIRTABLE_TOKEN_KEY (or AIRTABLE_API_KEY) and AIRTABLE_BASE_ID must be set in .env.local",
  );
  process.exit(1);
}

async function fetchAll(): Promise<unknown[]> {
  const records: unknown[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName!)}`,
    );
    if (offset) url.searchParams.set("offset", offset);
    url.searchParams.set("pageSize", "100");
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable ${res.status}: ${body}`);
    }
    const json = (await res.json()) as {
      records: unknown[];
      offset?: string;
    };
    records.push(...json.records);
    offset = json.offset;
  } while (offset);
  return records;
}

async function main() {
  const all = await fetchAll();
  console.log(`\nTotal records in "${tableName}": ${all.length}\n`);

  if (all.length === 0) return;

  // Collect all unique field names across records.
  const fieldSet = new Set<string>();
  for (const r of all as Array<{ fields: Record<string, unknown> }>) {
    for (const k of Object.keys(r.fields)) fieldSet.add(k);
  }
  console.log("Fields seen:");
  for (const f of Array.from(fieldSet).sort()) console.log(`  - ${f}`);

  let filtered = all;
  if (noteFilter) {
    // Try a few common column-name guesses since I don't know the schema yet.
    const candidates = ["Note ID", "NoteID", "Note", "note_id", "Note_ID"];
    filtered = (all as Array<{ fields: Record<string, unknown> }>).filter(
      (r) =>
        candidates.some((k) => {
          const v = r.fields[k];
          return typeof v === "string" && v.trim() === noteFilter;
        }),
    );
    console.log(
      `\nRecords matching note "${noteFilter}" (using columns ${candidates.join(", ")}): ${filtered.length}`,
    );
  }

  console.log(
    `\nFirst ${Math.min(3, filtered.length)} record(s) (full JSON):\n`,
  );
  for (const r of filtered.slice(0, 3)) {
    console.log(JSON.stringify(r, null, 2));
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
