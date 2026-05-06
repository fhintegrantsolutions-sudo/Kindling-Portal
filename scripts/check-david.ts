import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: ar } = await admin
    .from("access_requests")
    .select("*")
    .eq("email", "david@hal.com")
    .maybeSingle();
  console.log("\n=== access_request ===");
  console.log({
    id: ar?.id,
    status: ar?.status,
    note_id: ar?.note_id,
    investment_amount: ar?.investment_amount,
    setup_token: ar?.setup_token ? "(set)" : null,
    setup_completed_at: ar?.setup_completed_at,
  });

  if (!ar) return;

  const { data: parts } = await admin
    .from("participations")
    .select("id, user_id, note_id, invested_amount, funding_received, funding_cleared")
    .eq("access_request_id", ar.id);
  console.log("\n=== participations linked to this access_request ===");
  console.log(parts);

  const { data: regs } = await admin
    .from("note_registrations")
    .select("id, status, investment_amount, entity_type, name_for_agreement")
    .eq("access_request_id", ar.id);
  console.log("\n=== note_registrations linked to this access_request ===");
  console.log(regs);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
