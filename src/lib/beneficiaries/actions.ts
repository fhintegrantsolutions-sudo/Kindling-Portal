"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWriteEntityId } from "@/lib/entities/context";
import { formatPhone, phoneDigits } from "@/lib/phone";

export type BeneficiaryFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createBeneficiary(
  _prev: BeneficiaryFormState | undefined,
  formData: FormData,
): Promise<BeneficiaryFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const fields = parseFields(formData);
  const fieldErrors = validate(fields);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Beneficiaries belong to an investor ENTITY (RLS enforces auth_owns_entity),
  // so the row must carry entity_id or the insert is rejected.
  const entityId = await getWriteEntityId();
  if (!entityId) {
    return {
      error:
        "No investor entity is set up for your account. Contact info@kindling.network.",
    };
  }

  const overAllocated = await checkTotal(supabase, entityId, fields, null);
  if (overAllocated) return { fieldErrors: { percentage: overAllocated } };

  const { error } = await supabase.from("beneficiaries").insert({
    user_id: user.id,
    entity_id: entityId,
    name: fields.name,
    relation: fields.relation,
    percentage: fields.percentage,
    type: fields.type,
    dob: fields.dob,
    phone: fields.phone,
    address: fields.address,
    ssn_last4: fields.ssn_last4,
  });
  if (error) return { error: error.message };

  revalidatePath("/profile/beneficiaries");
  redirect("/profile/beneficiaries?saved=1");
}

export async function updateBeneficiary(
  beneficiaryId: string,
  _prev: BeneficiaryFormState | undefined,
  formData: FormData,
): Promise<BeneficiaryFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const fields = parseFields(formData);
  const fieldErrors = validate(fields);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // The row being edited already belongs to an entity; the 100% cap is scoped to
  // that entity, so read it from the row rather than assuming the current one.
  const { data: existing } = await supabase
    .from("beneficiaries")
    .select("entity_id")
    .eq("id", beneficiaryId)
    .maybeSingle();
  const entityId = existing?.entity_id ?? (await getWriteEntityId());
  if (!entityId) {
    return {
      error:
        "No investor entity is set up for your account. Contact info@kindling.network.",
    };
  }

  const overAllocated = await checkTotal(
    supabase,
    entityId,
    fields,
    beneficiaryId,
  );
  if (overAllocated) return { fieldErrors: { percentage: overAllocated } };

  const { error } = await supabase
    .from("beneficiaries")
    .update({
      name: fields.name,
      relation: fields.relation,
      percentage: fields.percentage,
      type: fields.type,
      dob: fields.dob,
      phone: fields.phone,
      address: fields.address,
      ssn_last4: fields.ssn_last4,
    })
    .eq("id", beneficiaryId);
  if (error) return { error: error.message };

  revalidatePath("/profile/beneficiaries");
  revalidatePath(`/profile/beneficiaries/${beneficiaryId}`);
  redirect("/profile/beneficiaries?saved=1");
}

export async function deleteBeneficiary(beneficiaryId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("beneficiaries")
    .delete()
    .eq("id", beneficiaryId);
  if (error) throw new Error(error.message);

  revalidatePath("/profile/beneficiaries");
}

// Enforce that a beneficiary type (Primary/Contingent) never exceeds 100% FOR A
// GIVEN ENTITY. Beneficiaries are per-entity, so each entity gets its own 100%
// allocation. Sums the other beneficiaries of the same type on that entity
// (excluding the row being edited) and returns an error message if adding this
// one would push the total over 100 — otherwise null. Under-100 is allowed (the
// list page warns about it); this only blocks over-allocation.
async function checkTotal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityId: string,
  fields: Fields,
  excludeId: string | null,
): Promise<string | null> {
  const { data } = await supabase
    .from("beneficiaries")
    .select("id, percentage")
    .eq("entity_id", entityId)
    .eq("type", fields.type);

  const othersTotal = (data ?? [])
    .filter((r) => r.id !== excludeId)
    .reduce((sum, r) => sum + Number(r.percentage), 0);

  const newTotal = othersTotal + fields.percentage;
  if (newTotal > 100) {
    const available = 100 - othersTotal;
    return `Your ${fields.type} beneficiaries already account for ${othersTotal}%, and this ${fields.percentage}% entry would bring the total to ${newTotal}%, which exceeds the 100% limit. Please lower another ${fields.type} beneficiary's percentage before increasing this one. At most ${available}% is available here.`;
  }
  return null;
}

type Fields = {
  name: string;
  relation: string;
  percentage: number;
  type: string;
  dob: string | null;
  phone: string | null;
  address: string | null;
  ssn_last4: string | null;
};

function parseFields(formData: FormData): Fields {
  return {
    name: String(formData.get("name") ?? "").trim(),
    relation: String(formData.get("relation") ?? "").trim(),
    percentage: Number(formData.get("percentage") ?? 0),
    type: String(formData.get("type") ?? "Primary").trim() || "Primary",
    dob: textOrNull(formData, "dob"),
    // Standardize to (XXX) XXX-XXXX; validate() rejects incomplete numbers.
    phone: ((raw) => (raw ? formatPhone(raw) : null))(
      String(formData.get("phone") ?? "").trim(),
    ),
    address: textOrNull(formData, "address"),
    ssn_last4: textOrNull(formData, "ssn_last4"),
  };
}

function validate(fields: Fields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.name) errors.name = "Required";
  if (!fields.relation) errors.relation = "Required";
  if (!Number.isFinite(fields.percentage)) {
    errors.percentage = "Must be a number";
  } else if (fields.percentage < 0 || fields.percentage > 100) {
    errors.percentage = "Must be between 0 and 100";
  }
  if (fields.type !== "Primary" && fields.type !== "Contingent") {
    errors.type = "Must be Primary or Contingent";
  }
  if (fields.phone !== null && phoneDigits(fields.phone).length !== 10) {
    errors.phone = "Enter a valid 10-digit phone number";
  }
  if (fields.ssn_last4 !== null && !/^[0-9]{4}$/.test(fields.ssn_last4)) {
    errors.ssn_last4 = "Enter the last 4 digits (numbers only)";
  }
  return errors;
}

function textOrNull(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v.length > 0 ? v : null;
}
