/**
 * Reconcile the investor_entities migration: a re-runnable, read-only
 * data-integrity check that the entity layer is internally consistent.
 *
 * Works against EITHER database, selected by env file:
 *   VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-reconciliation.ts
 *   VERIFY_ENV=.env.local   npx tsx scripts/verify/entity-reconciliation.ts
 *
 * (Default is .env.staging.) Uses the service-role client so RLS is bypassed —
 * this is a data-integrity check, not a security check. It only ever reads.
 *
 * Exit code 0 == every assertion passed.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

const ENV_FILE = process.env.VERIFY_ENV ?? ".env.staging";
const env = config({ path: ENV_FILE }).parsed ?? {};

const URL = env.STAGING_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE =
  env.STAGING_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_ROLE) {
  console.error(
    `Missing Supabase URL / service-role key in ${ENV_FILE}. ` +
      "Expected STAGING_SUPABASE_URL + STAGING_SERVICE_ROLE_KEY, or " +
      "NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const db = createClient(URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Tables that carry a nullable entity_id alongside user_id. */
const ENTITY_SCOPED_TABLES = [
  "participations",
  "note_registrations",
  "beneficiaries",
  "documents",
  "note_visibility",
] as const;

/**
 * Ownership-consistency scan reads at most this many rows per table. Fine at
 * current data volumes; if any table ever exceeds it, page with .range().
 */
const SCAN_LIMIT = 1000;

let failures = 0;

function ok(msg: string) {
  console.log(`ok:   ${msg}`);
}

function fail(msg: string) {
  failures += 1;
  console.log(`FAIL: ${msg}`);
}

/** Exact row count, no rows transferred. */
async function countRows(
  table: string,
  apply?: (q: ReturnType<typeof buildCountQuery>) => unknown,
): Promise<number> {
  const q = buildCountQuery(table);
  const query = (apply ? apply(q) : q) as typeof q;
  const { count, error } = await query;
  if (error) throw new Error(`count(${table}): ${error.message}`);
  return count ?? 0;
}

function buildCountQuery(table: string) {
  return db.from(table).select("*", { count: "exact", head: true });
}

async function main() {
  console.log(`entity reconciliation`);
  console.log(`env file: ${ENV_FILE}`);
  console.log(`database: ${URL}`);
  console.log("");

  const profileCount = await countRows("profiles");
  const entityCount = await countRows("investor_entities");

  // 1. Exactly one entity per login.
  if (entityCount === profileCount) {
    ok(`investor_entities (${entityCount}) == profiles (${profileCount})`);
  } else {
    fail(
      `investor_entities (${entityCount}) != profiles (${profileCount}) — expected one entity per login`,
    );
  }

  // 2. Every login has a primary entity.
  const primaryCount = await countRows("investor_entities", (q) =>
    q.eq("is_primary", true),
  );
  if (primaryCount === profileCount) {
    ok(`primary entities (${primaryCount}) == profiles (${profileCount})`);
  } else {
    fail(
      `primary entities (${primaryCount}) != profiles (${profileCount}) — some login has no primary entity`,
    );
  }

  // 3. No login has 2+ primary entities (a unique index should guarantee this).
  const { data: primaries, error: primaryErr } = await db
    .from("investor_entities")
    .select("owner_user_id")
    .eq("is_primary", true)
    .limit(SCAN_LIMIT);
  if (primaryErr) throw new Error(`primary scan: ${primaryErr.message}`);
  const primaryPerOwner = new Map<string, number>();
  for (const row of primaries ?? []) {
    const owner = row.owner_user_id as string;
    primaryPerOwner.set(owner, (primaryPerOwner.get(owner) ?? 0) + 1);
  }
  const multiPrimary = [...primaryPerOwner.entries()].filter(
    ([, n]) => n > 1,
  );
  if (multiPrimary.length === 0) {
    ok("no login has more than one primary entity");
  } else {
    fail(
      `${multiPrimary.length} login(s) have 2+ primary entities: ${multiPrimary
        .map(([owner, n]) => `${owner} (${n})`)
        .join(", ")}`,
    );
  }

  // 4. No orphans: a row that belongs to a login must carry an entity_id.
  for (const table of ENTITY_SCOPED_TABLES) {
    const orphans = await countRows(table, (q) =>
      q.not("user_id", "is", null).is("entity_id", null),
    );
    if (orphans === 0) {
      ok(`${table}: no rows with user_id set but entity_id null`);
    } else {
      fail(
        `${table}: ${orphans} row(s) have user_id set but entity_id null (orphaned by the backfill)`,
      );
    }
  }

  // 5. Ownership consistency: the row's entity must be owned by the row's user.
  for (const table of ENTITY_SCOPED_TABLES) {
    // NB: no `id` in the select — note_visibility has a composite key, no id column.
    const { data, error } = await db
      .from(table)
      .select("user_id, entity_id, entity:investor_entities!inner(owner_user_id)")
      .not("entity_id", "is", null)
      .limit(SCAN_LIMIT);
    if (error) throw new Error(`${table} ownership scan: ${error.message}`);

    const rows = (data ?? []) as unknown as Array<{
      user_id: string | null;
      entity_id: string;
      entity: { owner_user_id: string } | { owner_user_id: string }[];
    }>;

    if (rows.length === SCAN_LIMIT) {
      console.log(
        `      (note: ${table} ownership scan hit the ${SCAN_LIMIT}-row limit; add paging)`,
      );
    }

    const mismatched = rows.filter((r) => {
      const entity = Array.isArray(r.entity) ? r.entity[0] : r.entity;
      return !entity || entity.owner_user_id !== r.user_id;
    });

    if (mismatched.length === 0) {
      ok(`${table}: all ${rows.length} entity_id row(s) owned by the row's user`);
    } else {
      fail(
        `${table}: ${mismatched.length} row(s) point at an entity owned by a different user — ` +
          `e.g. user_id=${mismatched[0].user_id} entity_id=${mismatched[0].entity_id}`,
      );
    }
  }

  // 6. Every entity owner corresponds to an existing profile. (owner_user_id
  // FKs auth.users, not profiles, so there is no embeddable relation — compare
  // the id sets in JS.)
  const { data: entities, error: entityErr } = await db
    .from("investor_entities")
    .select("id, owner_user_id")
    .limit(SCAN_LIMIT);
  if (entityErr) throw new Error(`entity owner scan: ${entityErr.message}`);
  const { data: profiles, error: profileErr } = await db
    .from("profiles")
    .select("id")
    .limit(SCAN_LIMIT);
  if (profileErr) throw new Error(`profile scan: ${profileErr.message}`);

  const profileIds = new Set((profiles ?? []).map((p) => p.id as string));
  const ownerless = (entities ?? []).filter(
    (e) => !profileIds.has(e.owner_user_id as string),
  );
  if (ownerless.length === 0) {
    ok(`all ${entities?.length ?? 0} entity owner_user_id(s) resolve to a profile`);
  } else {
    fail(
      `${ownerless.length} entity/entities have an owner_user_id with no profile — ` +
        `e.g. entity ${ownerless[0].id} owner ${ownerless[0].owner_user_id}`,
    );
  }

  console.log("");
  console.log(
    failures === 0 ? "RECONCILIATION PASS" : `RECONCILIATION FAIL (${failures})`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`❌ ERROR: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
