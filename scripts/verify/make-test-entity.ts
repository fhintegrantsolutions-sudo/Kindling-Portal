/**
 * Provision / inspect / remove an EXTRA investor entity for a login, so that
 * multi-entity behavior is testable before admin entity CRUD (Phase 3) exists.
 *
 * Usage:
 *   npx tsx scripts/verify/make-test-entity.ts add <email> "<display name>" [entity_type] [business_name]
 *   npx tsx scripts/verify/make-test-entity.ts list <email>
 *   npx tsx scripts/verify/make-test-entity.ts remove <entity_id>
 *
 * Works against EITHER database, selected by env file (default .env.staging):
 *   VERIFY_ENV=.env.staging npx tsx scripts/verify/make-test-entity.ts list rls-a@example.com
 *   VERIFY_ENV=.env.local   npx tsx scripts/verify/make-test-entity.ts list someone@example.com
 *
 * Uses the service-role client: investor_entities is admin-managed and lenders
 * have no insert/update policy on it.
 *
 * `add` NEVER creates a second primary (is_primary is always false) — a unique
 * partial index forbids two primaries per owner.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

const ENV_FILE = process.env.VERIFY_ENV ?? ".env.staging";
const env = config({ path: ENV_FILE }).parsed ?? {};

const URL = env.STAGING_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE =
  env.STAGING_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

const USAGE = `usage:
  npx tsx scripts/verify/make-test-entity.ts add <email> "<display name>" [entity_type] [business_name]
  npx tsx scripts/verify/make-test-entity.ts list <email>
  npx tsx scripts/verify/make-test-entity.ts remove <entity_id>

env: VERIFY_ENV=<env file>   (default .env.staging)`;

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

if (!URL || !SERVICE_ROLE) {
  die(
    `Missing Supabase URL / service-role key in ${ENV_FILE}. ` +
      "Expected STAGING_SUPABASE_URL + STAGING_SERVICE_ROLE_KEY, or " +
      "NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const db = createClient(URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Tables that carry entity_id — an entity with any of these can't be deleted. */
const DEPENDENT_TABLES = [
  "participations",
  "note_registrations",
  "beneficiaries",
  "documents",
  "note_visibility",
] as const;

async function ownerIdForEmail(email: string): Promise<string> {
  const { data, error } = await db
    .from("profiles")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();
  if (error) die(`profile lookup failed: ${error.message}`);
  if (!data) die(`no profile with email ${email}`);
  return data.id as string;
}

async function listEntities(email: string) {
  const ownerId = await ownerIdForEmail(email);
  const { data, error } = await db
    .from("investor_entities")
    .select(
      "id, display_name, entity_type, business_name, loan_agreement_title, is_primary",
    )
    .eq("owner_user_id", ownerId)
    .order("is_primary", { ascending: false })
    .order("display_name", { ascending: true });
  if (error) die(`entity list failed: ${error.message}`);

  const rows = data ?? [];
  console.log(`entities for ${email} (owner ${ownerId}): ${rows.length}`);
  console.table(rows);
}

async function addEntity(
  email: string,
  displayName: string,
  entityType: string,
  businessName: string,
) {
  const ownerId = await ownerIdForEmail(email);
  const { data, error } = await db
    .from("investor_entities")
    .insert({
      owner_user_id: ownerId,
      display_name: displayName,
      entity_type: entityType,
      business_name: businessName,
      loan_agreement_title: businessName,
      // NEVER a second primary: the unique partial index would reject it.
      is_primary: false,
    })
    .select()
    .single();
  if (error) die(`entity insert failed: ${error.message}`);

  console.log(`created entity for ${email}:`);
  console.dir(data, { depth: null });
}

async function removeEntity(entityId: string) {
  const { data: entity, error: getErr } = await db
    .from("investor_entities")
    .select("id, display_name, is_primary, owner_user_id")
    .eq("id", entityId)
    .maybeSingle();
  if (getErr) die(`entity lookup failed: ${getErr.message}`);
  if (!entity) die(`no entity with id ${entityId}`);

  if (entity.is_primary) {
    die(
      `refusing to delete ${entityId} (${entity.display_name}): it is the owner's PRIMARY entity`,
    );
  }

  const blockers: string[] = [];
  for (const table of DEPENDENT_TABLES) {
    const { count, error } = await db
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("entity_id", entityId);
    if (error) die(`count(${table}) failed: ${error.message}`);
    if ((count ?? 0) > 0) blockers.push(`${table}=${count}`);
  }

  if (blockers.length > 0) {
    die(
      `refusing to delete ${entityId} (${entity.display_name}): it still has ` +
        `dependent rows — ${blockers.join(", ")}. Remove or reassign them first.`,
    );
  }

  const { error: delErr } = await db
    .from("investor_entities")
    .delete()
    .eq("id", entityId);
  if (delErr) die(`entity delete failed: ${delErr.message}`);

  console.log(`deleted entity ${entityId} (${entity.display_name})`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  console.log(`make-test-entity`);
  console.log(`env file: ${ENV_FILE}`);
  console.log(`database: ${URL}`);
  console.log("");

  switch (command) {
    case "add": {
      const [email, displayName, entityType, businessName] = args;
      if (!email || !displayName) die(`add requires <email> and <display name>\n\n${USAGE}`);
      await addEntity(
        email,
        displayName,
        entityType || "LLC",
        businessName || displayName,
      );
      break;
    }
    case "list": {
      const [email] = args;
      if (!email) die(`list requires <email>\n\n${USAGE}`);
      await listEntities(email);
      break;
    }
    case "remove": {
      const [entityId] = args;
      if (!entityId) die(`remove requires <entity_id>\n\n${USAGE}`);
      await removeEntity(entityId);
      break;
    }
    default:
      die(USAGE);
  }
}

main().catch((e) => {
  console.error(`❌ ERROR: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
