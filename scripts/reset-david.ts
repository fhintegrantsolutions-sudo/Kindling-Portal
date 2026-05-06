// One-off cleanup so we can re-test the new lead-setup flow with David.
// Run with: npx tsx scripts/reset-david.ts
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const EMAIL = "david@hal.com";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: ar } = await admin
    .from("access_requests")
    .select("id")
    .eq("email", EMAIL)
    .maybeSingle();

  if (!ar) {
    console.log(`No access_request found for ${EMAIL}`);
    return;
  }

  const arId = ar.id as string;
  console.log(`Found access_request ${arId} for ${EMAIL}`);

  const { error: pErr, count: pCount } = await admin
    .from("participations")
    .delete({ count: "exact" })
    .eq("access_request_id", arId);
  if (pErr) throw pErr;
  console.log(`Deleted ${pCount ?? 0} participation(s)`);

  const { error: nrErr, count: nrCount } = await admin
    .from("note_registrations")
    .delete({ count: "exact" })
    .eq("access_request_id", arId);
  if (nrErr) throw nrErr;
  console.log(`Deleted ${nrCount ?? 0} note_registration(s)`);

  const { error: arErr } = await admin
    .from("access_requests")
    .update({
      status: "pending",
      note_id: null,
      investment_amount: null,
      setup_token: null,
      setup_token_expires_at: null,
      setup_completed_at: null,
    })
    .eq("id", arId);
  if (arErr) throw arErr;
  console.log(`Reset access_request ${arId} → pending`);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
