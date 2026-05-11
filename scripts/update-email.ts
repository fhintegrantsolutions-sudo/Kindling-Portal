// Update a user's email on both the auth.users record and the profiles row.
//
// Usage:
//   npx tsx scripts/update-email.ts <oldEmail> <newEmail>

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const oldEmail = process.argv[2];
  const newEmail = process.argv[3];
  if (!oldEmail || !newEmail) {
    console.error(
      "Usage: npx tsx scripts/update-email.ts <oldEmail> <newEmail>",
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find the user
  let userId: string | null = null;
  let page = 1;
  outer: while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email?.toLowerCase() === oldEmail.toLowerCase()) {
        userId = u.id;
        break outer;
      }
    }
    if (data.users.length < 1000) break;
    page++;
  }
  if (!userId) {
    console.error(`No user found with email ${oldEmail}`);
    process.exit(1);
  }

  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true,
  });
  if (authErr) {
    console.error(`auth update failed: ${authErr.message}`);
    process.exit(1);
  }

  const { error: profErr } = await admin
    .from("profiles")
    .update({ email: newEmail })
    .eq("id", userId);
  if (profErr) {
    console.error(`profile update failed: ${profErr.message}`);
    process.exit(1);
  }

  console.log(`\n✓ ${oldEmail}  →  ${newEmail}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
