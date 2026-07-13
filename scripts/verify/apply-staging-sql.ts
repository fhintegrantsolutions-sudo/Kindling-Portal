/**
 * Apply a .sql file (or inline SQL) to the STAGING database only.
 *
 * Guard rails:
 *  - Refuses to run unless STAGING_DB_URL is set in .env.staging.
 *  - Refuses to run if the target host matches the REAL project ref from
 *    .env.local (NEXT_PUBLIC_SUPABASE_URL). Production is applied by hand.
 *
 * Usage:
 *   npx tsx scripts/verify/apply-staging-sql.ts supabase/migrations/<file>.sql
 *   npx tsx scripts/verify/apply-staging-sql.ts --sql "select 1"
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { Client } from "pg";

const staging = config({ path: ".env.staging" }).parsed ?? {};
const real = config({ path: ".env.local", override: false }).parsed ?? {};

const dbUrl = staging.STAGING_DB_URL;
if (!dbUrl) {
  console.error("STAGING_DB_URL is not set in .env.staging — refusing to run.");
  process.exit(1);
}

// Safety: never let this point at the real project.
const realRef = (real.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace("https://", "")
  .split(".")[0];
if (realRef && dbUrl.includes(realRef)) {
  console.error(
    `🛑 ABORT: STAGING_DB_URL references the REAL project ref (${realRef}).\n` +
      "Production migrations are applied by hand. Refusing to run.",
  );
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  let sql: string;
  let label: string;
  if (args[0] === "--sql") {
    sql = args.slice(1).join(" ");
    label = "(inline SQL)";
  } else if (args[0]) {
    sql = readFileSync(args[0], "utf8");
    label = args[0];
  } else {
    console.error("Usage: apply-staging-sql.ts <file.sql> | --sql \"<sql>\"");
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log(`applying to STAGING: ${label}`);
  try {
    const res = await client.query(sql);
    const results = Array.isArray(res) ? res : [res];
    for (const r of results) {
      if (r.rows?.length) console.table(r.rows);
    }
    console.log("✅ applied to staging");
  } catch (e) {
    console.error(`❌ FAILED: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
