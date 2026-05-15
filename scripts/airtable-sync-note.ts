// Sync Airtable "Lender Packet" records for one Note ID into Supabase:
//   - Profile exists for the email → insert participation
//   - Profile doesn't exist        → insert access_request (status pending)
//
// Bank fields from Airtable are dropped intentionally (no banking PII in
// this app). Reads AIRTABLE_TOKEN_KEY, AIRTABLE_BASE_ID, SUPABASE keys
// from .env.local.
//
// Usage:
//   npx tsx scripts/airtable-sync-note.ts K26002             # dry run
//   npx tsx scripts/airtable-sync-note.ts K26002 --confirm   # write

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const TABLE_NAME = "Lender Packet";

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

async function main() {
  const noteIdArg = process.argv[2];
  const dryRun = !process.argv.includes("--confirm");
  if (!noteIdArg) {
    console.error("Usage: npx tsx scripts/airtable-sync-note.ts <NOTE_ID> [--confirm]");
    process.exit(1);
  }

  const apiKey =
    process.env.AIRTABLE_TOKEN_KEY ?? process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !baseId || !url || !serviceKey) {
    throw new Error(
      "Need AIRTABLE_TOKEN_KEY, AIRTABLE_BASE_ID, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\n${dryRun ? "[DRY RUN]" : "[EXECUTING]"} sync ${noteIdArg} from Airtable "${TABLE_NAME}"\n`);

  // 1. Resolve the note UUID.
  const { data: note } = await admin
    .from("notes")
    .select("id, note_id")
    .eq("note_id", noteIdArg)
    .maybeSingle();
  if (!note) throw new Error(`No Supabase note with note_id="${noteIdArg}"`);
  const noteUuid = note.id as string;
  console.log(`✓ Supabase note: ${noteIdArg} = ${noteUuid}`);

  // 2. Fetch Airtable records for this note.
  const all = await fetchAirtable(baseId, apiKey);
  const records = all.filter((r) => {
    const v = r.fields["Note ID"];
    return typeof v === "string" && v.trim() === noteIdArg;
  });
  console.log(`✓ Airtable records for ${noteIdArg}: ${records.length}\n`);
  if (records.length === 0) return;

  // 3. Lookups
  const emailsLower = Array.from(
    new Set(
      records
        .map((r) => (r.fields["Email"] as string | undefined)?.toLowerCase().trim())
        .filter(Boolean) as string[],
    ),
  );
  const profileByEmail = new Map<string, string>();
  if (emailsLower.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email")
      .in("email", emailsLower);
    for (const p of (profiles ?? []) as Array<{ id: string; email: string }>) {
      profileByEmail.set(p.email.toLowerCase(), p.id);
    }
    // Also check with case-insensitive ilike for profiles whose stored email
    // case doesn't match (Supabase .in is case-sensitive).
    const missingEmails = emailsLower.filter((e) => !profileByEmail.has(e));
    for (const e of missingEmails) {
      const { data } = await admin
        .from("profiles")
        .select("id, email")
        .ilike("email", e)
        .maybeSingle();
      if (data) profileByEmail.set(e, data.id as string);
    }
  }

  // 4. Pre-fetch existing participations on this note to avoid duplicates.
  const { data: existingParts } = await admin
    .from("participations")
    .select("user_id")
    .eq("note_id", noteUuid);
  const usersWithParticipation = new Set(
    ((existingParts ?? []) as Array<{ user_id: string | null }>)
      .map((p) => p.user_id)
      .filter(Boolean) as string[],
  );

  // 5. Pre-fetch existing access_requests by email so we don't double-add.
  const { data: existingAR } = await admin
    .from("access_requests")
    .select("email")
    .in("email", emailsLower);
  const emailsWithAR = new Set(
    ((existingAR ?? []) as Array<{ email: string }>).map((r) =>
      r.email.toLowerCase(),
    ),
  );

  // 6. Plan rows
  type Plan =
    | { kind: "participation"; record: AirtableRecord; userId: string }
    | { kind: "access_request"; record: AirtableRecord }
    | { kind: "skip"; record: AirtableRecord; reason: string };
  const plans: Plan[] = [];

  for (const r of records) {
    const f = r.fields;
    const email = ((f["Email"] as string) ?? "").trim();
    const amount = Number(f["Investment Amount"]);
    if (!email) {
      plans.push({ kind: "skip", record: r, reason: "no email" });
      continue;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      plans.push({ kind: "skip", record: r, reason: "no investment amount" });
      continue;
    }
    const userId = profileByEmail.get(email.toLowerCase());
    if (userId) {
      if (usersWithParticipation.has(userId)) {
        plans.push({
          kind: "skip",
          record: r,
          reason: `user already has a participation on ${noteIdArg}`,
        });
      } else {
        plans.push({ kind: "participation", record: r, userId });
        usersWithParticipation.add(userId); // dedupe within the batch
      }
    } else {
      if (emailsWithAR.has(email.toLowerCase())) {
        plans.push({
          kind: "skip",
          record: r,
          reason: `access_request already exists for ${email}`,
        });
      } else {
        plans.push({ kind: "access_request", record: r });
        emailsWithAR.add(email.toLowerCase());
      }
    }
  }

  const counts = {
    participation: plans.filter((p) => p.kind === "participation").length,
    access_request: plans.filter((p) => p.kind === "access_request").length,
    skip: plans.filter((p) => p.kind === "skip").length,
  };
  console.log(`Plan summary:`);
  console.log(`  participations to create:   ${counts.participation}`);
  console.log(`  access_requests to create:  ${counts.access_request}`);
  console.log(`  skipped:                    ${counts.skip}`);
  for (const p of plans.filter((p) => p.kind === "skip")) {
    const f = p.record.fields;
    console.log(
      `    - ${(f["Full Name"] as string) ?? "(no name)"} <${(f["Email"] as string) ?? "no email"}>: ${(p as { reason: string }).reason}`,
    );
  }

  if (dryRun) {
    console.log("\nRe-run with --confirm to execute.\n");
    return;
  }

  // 7. Insert rows
  const partRows = plans
    .filter((p) => p.kind === "participation")
    .map((p) => buildParticipation(p.record, noteUuid, (p as { userId: string }).userId));
  const arRows = plans
    .filter((p) => p.kind === "access_request")
    .map((p) => buildAccessRequest(p.record));

  if (partRows.length > 0) {
    const { error } = await admin.from("participations").insert(partRows);
    if (error) {
      console.error(`✗ participations insert failed: ${error.message}`);
      process.exit(1);
    }
    console.log(`✓ Inserted ${partRows.length} participations`);
  }
  if (arRows.length > 0) {
    const { error } = await admin.from("access_requests").insert(arRows);
    if (error) {
      console.error(`✗ access_requests insert failed: ${error.message}`);
      process.exit(1);
    }
    console.log(`✓ Inserted ${arRows.length} access_requests`);
  }
  console.log("");
}

function buildParticipation(
  r: AirtableRecord,
  noteUuid: string,
  userId: string,
) {
  const f = r.fields;
  const cleared = Boolean(f["Funds Cleared"]);
  const received = Boolean(f["Funds Received"]) || cleared;
  return {
    user_id: userId,
    note_id: noteUuid,
    invested_amount: String(Number(f["Investment Amount"]).toFixed(2)),
    status: "Active",
    funding_received: received,
    funding_deposited: cleared, // we don't track deposited separately on Airtable
    funding_cleared: cleared,
    funding_type: mapType(f["Type of Funds"] as string | undefined),
    funding_received_date: toIsoDate(f["Date Funds Received"]),
    funding_cleared_date: cleared
      ? toIsoDate(
          f["Funds Cleared - Last Modified Time"] ?? f["Date Funds Received"],
        )
      : null,
  };
}

function buildAccessRequest(r: AirtableRecord) {
  const f = r.fields;
  return {
    first_name:
      toProperCase(((f["First Name"] as string) ?? "").trim()) || "Unknown",
    last_name:
      toProperCase(((f["Last Name"] as string) ?? "").trim()) || "Unknown",
    email: ((f["Email"] as string) ?? "").trim().toLowerCase(),
    phone: ((f["Phone Number"] as string) ?? "").trim() || "",
    is_tcc_member: false,
    message: `From Airtable Lender Packet · investment $${Number(f["Investment Amount"]).toFixed(2)}`,
    investment_amount: String(Number(f["Investment Amount"]).toFixed(2)),
    referral_code: ((f["Referral Source"] as string) ?? "").trim() || null,
    status: "pending" as const,
  };
}

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

function mapType(v: string | undefined): "wire" | "check" | "ach" | "other" | null {
  if (!v) return null;
  const lc = v.toLowerCase();
  if (lc.includes("wire")) return "wire";
  if (lc.includes("check")) return "check";
  if (lc.includes("ach")) return "ach";
  return "other";
}

function toIsoDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  // Already YYYY-MM-DD?
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // ISO timestamp — extract the date part.
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

async function fetchAirtable(
  baseId: string,
  apiKey: string,
): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const u = new URL(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(TABLE_NAME)}`,
    );
    if (offset) u.searchParams.set("offset", offset);
    u.searchParams.set("pageSize", "100");
    const res = await fetch(u, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable ${res.status}: ${body}`);
    }
    const json = (await res.json()) as {
      records: AirtableRecord[];
      offset?: string;
    };
    records.push(...json.records);
    offset = json.offset;
  } while (offset);
  return records;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
