"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";

export type EntityFormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Tables that carry entity_id. An entity holding rows in ANY of them cannot be
 * deleted — mirrors `scripts/verify/make-test-entity.ts remove`.
 */
const DEPENDENT_TABLES = [
  { table: "participations", label: "participation" },
  { table: "note_registrations", label: "note registration" },
  { table: "beneficiaries", label: "beneficiary" },
  { table: "documents", label: "document" },
  { table: "note_visibility", label: "note visibility row" },
] as const;

function revalidate() {
  revalidatePath("/admin/users/[id]", "layout");
  revalidatePath("/admin/users");
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function parseFields(formData: FormData) {
  return {
    display_name: text(formData, "display_name"),
    entity_type: text(formData, "entity_type") || null,
    business_name: text(formData, "business_name") || null,
    loan_agreement_title: text(formData, "loan_agreement_title") || null,
    address_street: text(formData, "address_street") || null,
    address_city: text(formData, "address_city") || null,
    address_state: text(formData, "address_state") || null,
    address_zip: text(formData, "address_zip") || null,
  };
}

/**
 * Create an entity for a login.
 *
 * is_primary is NEVER set to true for an owner who already has entities — the
 * partial unique index `investor_entities_one_primary_idx` forbids a second
 * primary. The one exception is the owner's FIRST entity: every login must end
 * up with exactly one primary, never zero.
 */
export async function createEntity(
  ownerUserId: string,
  _prev: EntityFormState | undefined,
  formData: FormData,
): Promise<EntityFormState> {
  await requireAdmin();
  const supabase = await createClient();

  const fields = parseFields(formData);
  if (!fields.display_name) {
    return { fieldErrors: { display_name: "Required" } };
  }

  const { count, error: countErr } = await supabase
    .from("investor_entities")
    .select("*", { count: "exact", head: true })
    .eq("owner_user_id", ownerUserId);
  if (countErr) return { error: countErr.message };

  const { error } = await supabase.from("investor_entities").insert({
    owner_user_id: ownerUserId,
    ...fields,
    is_primary: (count ?? 0) === 0,
  });
  if (error) return { error: error.message };

  revalidate();
  return { message: `Added ${fields.display_name}.` };
}

/**
 * Edit an entity's descriptive fields. Never touches owner_user_id or
 * is_primary (use setPrimaryEntity for the latter).
 */
export async function updateEntity(
  entityId: string,
  _prev: EntityFormState | undefined,
  formData: FormData,
): Promise<EntityFormState> {
  await requireAdmin();
  const supabase = await createClient();

  const fields = parseFields(formData);
  if (!fields.display_name) {
    return { fieldErrors: { display_name: "Required" } };
  }

  const { error } = await supabase
    .from("investor_entities")
    .update(fields)
    .eq("id", entityId);
  if (error) return { error: error.message };

  revalidate();
  return { message: `Saved ${fields.display_name}.` };
}

/**
 * Promote an entity to its owner's primary.
 *
 * The unique partial index means two primaries can't coexist even for an
 * instant, so we DEMOTE the current primary first and only then promote. If the
 * promote fails we restore the demoted one, so the owner is never left with
 * zero primaries.
 */
export async function setPrimaryEntity(
  entityId: string,
): Promise<{ error?: string; message?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: entity, error: getErr } = await supabase
    .from("investor_entities")
    .select("id, display_name, is_primary, owner_user_id")
    .eq("id", entityId)
    .maybeSingle();
  if (getErr) return { error: getErr.message };
  if (!entity) return { error: "Entity not found." };
  if (entity.is_primary) return { message: "Already primary." };

  const { data: current, error: curErr } = await supabase
    .from("investor_entities")
    .select("id")
    .eq("owner_user_id", entity.owner_user_id)
    .eq("is_primary", true)
    .maybeSingle();
  if (curErr) return { error: curErr.message };

  if (current) {
    const { error: demoteErr } = await supabase
      .from("investor_entities")
      .update({ is_primary: false })
      .eq("id", current.id);
    if (demoteErr) return { error: demoteErr.message };
  }

  const { error: promoteErr } = await supabase
    .from("investor_entities")
    .update({ is_primary: true })
    .eq("id", entityId);
  if (promoteErr) {
    // Roll the demotion back — an owner with zero primaries is worse than a
    // failed promotion.
    if (current) {
      await supabase
        .from("investor_entities")
        .update({ is_primary: true })
        .eq("id", current.id);
    }
    return { error: `Failed to set primary: ${promoteErr.message}` };
  }

  revalidate();
  return { message: `${entity.display_name} is now the primary entity.` };
}

/**
 * Delete an entity. Refuses when it is the owner's primary, when it is their
 * only entity, or when it still holds rows in any entity-scoped table.
 */
export async function deleteEntity(
  entityId: string,
): Promise<{ error?: string; message?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: entity, error: getErr } = await supabase
    .from("investor_entities")
    .select("id, display_name, is_primary, owner_user_id")
    .eq("id", entityId)
    .maybeSingle();
  if (getErr) return { error: getErr.message };
  if (!entity) return { error: "Entity not found." };

  if (entity.is_primary) {
    return {
      error:
        "Cannot delete the primary entity. Make another entity primary first.",
    };
  }

  const { count, error: countErr } = await supabase
    .from("investor_entities")
    .select("*", { count: "exact", head: true })
    .eq("owner_user_id", entity.owner_user_id);
  if (countErr) return { error: countErr.message };
  if ((count ?? 0) <= 1) {
    return { error: "Cannot delete the owner's only entity." };
  }

  const blockers: string[] = [];
  for (const { table, label } of DEPENDENT_TABLES) {
    const { count: n, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("entity_id", entityId);
    if (error) return { error: `count(${table}) failed: ${error.message}` };
    if ((n ?? 0) > 0) blockers.push(`${n} ${label}(s)`);
  }
  if (blockers.length > 0) {
    return {
      error: `Cannot delete: ${blockers.join(", ")}. Reassign or remove them first.`,
    };
  }

  const { error: delErr } = await supabase
    .from("investor_entities")
    .delete()
    .eq("id", entityId);
  if (delErr) return { error: delErr.message };

  revalidate();
  return { message: `Deleted ${entity.display_name}.` };
}
