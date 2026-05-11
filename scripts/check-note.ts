// Quick read of a note's date fields. Run with:
//   npx tsx scripts/check-note.ts K24001
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const noteId = process.argv[2];
if (!noteId) {
  console.error("Usage: npx tsx scripts/check-note.ts <NOTE_ID>");
  process.exit(1);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from("notes")
    .select(
      "note_id, title, principal, rate, term_months, monthly_payment, contract_date, first_payment_date, maturity_date, funding_start_date, funding_end_date, payment_start_date, status, client_status, updated_at",
    )
    .eq("note_id", noteId!)
    .maybeSingle();

  if (error) {
    console.error(error);
    process.exit(1);
  }
  if (!data) {
    console.log(`No note with note_id=${noteId}`);
    process.exit(0);
  }
  console.log(JSON.stringify(data, null, 2));
}

main();
