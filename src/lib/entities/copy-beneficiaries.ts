"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentEntityContext } from "@/lib/entities/context";

// Copy every beneficiary from one owned entity into the CURRENTLY SELECTED
// entity. Ownership of both is validated. Refuses if the target already has
// beneficiaries, so this can never silently push an entity past the 100% cap.
export async function copyBeneficiariesFromEntity(
  sourceEntityId: string,
): Promise<{ error?: string; message?: string }> {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.mode === "all" || !ctx.currentEntityId) {
    return { error: "Pick a single entity to copy beneficiaries into." };
  }
  const target = ctx.currentEntityId;
  if (sourceEntityId === target) {
    return { error: "Source and target are the same entity." };
  }
  if (!ctx.entities.some((e) => e.id === sourceEntityId)) {
    return { error: "Unknown source entity." };
  }

  const { count } = await supabase
    .from("beneficiaries")
    .select("*", { count: "exact", head: true })
    .eq("entity_id", target);
  if ((count ?? 0) > 0) {
    return {
      error:
        "This entity already has beneficiaries. Remove them first if you want to copy a different set.",
    };
  }

  const { data: source, error: readErr } = await supabase
    .from("beneficiaries")
    .select(
      "user_id, name, relation, percentage, type, dob, phone, address, ssn_last4",
    )
    .eq("entity_id", sourceEntityId);
  if (readErr) return { error: readErr.message };
  if (!source || source.length === 0) {
    return { error: "That entity has no beneficiaries to copy." };
  }

  const rows = source.map((b) => ({ ...b, entity_id: target }));
  const { error: insErr } = await supabase.from("beneficiaries").insert(rows);
  if (insErr) return { error: insErr.message };

  revalidatePath("/profile/beneficiaries");
  return { message: `Copied ${rows.length} beneficiary(ies).` };
}
