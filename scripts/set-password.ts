// Set a Supabase auth user's password directly (no email).
//
// Usage:
//   npx tsx scripts/set-password.ts <email>                 # generates random temp pw
//   npx tsx scripts/set-password.ts <email> <password>      # sets the given pw
//
// The script prints the password it set so you can share it with the user
// out-of-band. They can change it via the "Forgot password?" reset flow
// once you wire up email (or by editing on /profile if you ever expose it).

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const email = process.argv[2];
  const explicit = process.argv[3];
  if (!email) {
    console.error("Usage: npx tsx scripts/set-password.ts <email> [password]");
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
      if (u.email?.toLowerCase() === email.toLowerCase()) {
        userId = u.id;
        break outer;
      }
    }
    if (data.users.length < 1000) break;
    page++;
  }
  if (!userId) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  const password = explicit ?? memorablePassword();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
  });
  if (error) {
    console.error(`Failed to set password: ${error.message}`);
    process.exit(1);
  }

  console.log(`\n✓ Password set for ${email}`);
  console.log(`  Password: ${password}\n`);
  console.log(
    "Share this with the user out-of-band. They can change it later.\n",
  );
}

function memorablePassword(): string {
  // Word-style temp password: "Adjective-Noun-NNNN". Easy to communicate.
  const adjectives = [
    "Sunny", "Brisk", "Quiet", "Steady", "Lively", "Mellow", "Crisp", "Sharp",
  ];
  const nouns = [
    "River", "Cedar", "Bluff", "Harbor", "Granite", "Meadow", "Summit", "Cypress",
  ];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${a}-${n}-${num}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
