// Set a Supabase auth user's password directly via the admin API. Useful when
// the user can't receive the standard recovery email (rate-limited, going to
// spam, whatever) and you need to hand them credentials manually.
//
// Usage:
//   npx tsx scripts/set-user-password.ts --email=hdavidsh@gmail.com
//       → generates a strong random password, prints it once, sets it
//   npx tsx scripts/set-user-password.ts --email=hdavidsh@gmail.com --password='TempPass!1234'
//       → sets the password you specify
//
// The user does NOT receive any email; you're responsible for getting the
// password to them out-of-band (Signal, in person, whatever).

import { config } from "dotenv";
import { createClient, type User } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const args = process.argv.slice(2);
  const emailArg = args.find((a) => a.startsWith("--email="));
  const passwordArg = args.find((a) => a.startsWith("--password="));

  if (!emailArg) {
    console.error(
      "Usage: npx tsx scripts/set-user-password.ts --email=<addr> [--password=<pw>]",
    );
    process.exit(1);
  }
  const email = emailArg.slice("--email=".length).trim().toLowerCase();
  const password = passwordArg
    ? passwordArg.slice("--password=".length)
    : generatePassword();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local",
    );
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // listUsers is paged; walk pages until we find a match. With <1000 users
  // a single page is fine in practice.
  let user: User | null = null;
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const match = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === email,
    );
    if (match) {
      user = match;
      break;
    }
    if (data.users.length < 1000) break;
    page++;
  }
  if (!user) {
    console.error(`No user found with email "${email}".`);
    process.exit(1);
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
  });
  if (error) {
    console.error(`Failed to set password: ${error.message}`);
    process.exit(1);
  }

  console.log("");
  console.log(`✓ Password set for ${email}`);
  console.log(`  user_id:  ${user.id}`);
  if (!passwordArg) {
    console.log(`  password: ${password}`);
    console.log("");
    console.log(
      "Copy this now — it's printed only once. Send it to the user securely.",
    );
  }
  console.log("");
}

function generatePassword(): string {
  // 16 chars, mix of letters + digits + a few symbols. Skips 0/O/1/I/l to
  // avoid handoff confusion when reading the password aloud.
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const sym = "!@#$%&*";
  const pick = (s: string) => s.charAt(Math.floor(Math.random() * s.length));
  const body = Array.from({ length: 14 }, () => pick(alpha)).join("");
  return body + pick(sym) + pick("23456789");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
