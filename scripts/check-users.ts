import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, name, role");
  console.log("\n=== profiles ===");
  console.log(profiles);

  const { data: parts } = await admin
    .from("participations")
    .select("id, user_id, note_id, invested_amount, funding_received, funding_cleared, access_request_id");
  console.log("\n=== participations ===");
  console.log(parts);

  const { data: notes } = await admin
    .from("notes")
    .select("id, note_id, title, status, client_status, is_private");
  console.log("\n=== notes ===");
  console.log(notes);

  const { data: visibility } = await admin
    .from("note_visibility")
    .select("note_id, user_id");
  console.log("\n=== note_visibility ===");
  console.log(visibility);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
