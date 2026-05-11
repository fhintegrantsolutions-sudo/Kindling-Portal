// Quick: count participations per note. Run with:
//   npx tsx scripts/count-by-note.ts
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: notes } = await admin
    .from("notes")
    .select("id, note_id")
    .order("note_id", { ascending: true });
  for (const n of (notes ?? []) as Array<{ id: string; note_id: string }>) {
    const { count } = await admin
      .from("participations")
      .select("*", { count: "exact", head: true })
      .eq("note_id", n.id);
    console.log(`${n.note_id.padEnd(8)}  ${count ?? 0} participations`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
