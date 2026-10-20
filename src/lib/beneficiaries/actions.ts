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

export type PercentagesState = { error?: string; message?: string };

// Save every beneficiary's percentage for the current entity in one go, so a
// lender can rebalance (e.g. 50/50 -> 40/60) without saving people one at a
// time. Primary must total exactly 100%; Contingent must total 0% or 100%.
// Adding or editing a single beneficiary no longer enforces totals — this is
// where they get balanced.
export async function saveBeneficiaryPercentages(
  _prev: PercentagesState | undefined,
  formData: FormData,
): Promise<PercentagesState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const entityId = await getWriteEntityId();
  if (!entityId) return { error: "Choose an entity first." };

  const { data: rows } = await supabase
    .from("beneficiaries")
    .select("id, type, percentage")
    .eq("entity_id", entityId);
  const list = (rows ?? []) as Array<{
    id: string;
    type: string;
    percentage: number | string;
  }>;
  if (list.length === 0) return { error: "No beneficiaries to update." };

  const next = new Map<string, number>();
  for (const r of list) {
    const raw = formData.get(`pct_${r.id}`);
    const n = raw === null ? Number(r.percentage) : Number(String(raw).trim());
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return { error: "Each percentage must be a number from 0 to 100." };
    }
    next.set(r.id, Math.round(n * 100) / 100);
  }

  const total = (type: string) =>
    Math.round(
      list
        .filter((r) => r.type === type)
        .reduce((sum, r) => sum + (next.get(r.id) ?? 0), 0) * 100,
    ) / 100;
  const hasPrimary = list.some((r) => r.type === "Primary");
  const primaryTotal = total("Primary");
  const contingentTotal = total("Contingent");
  if (hasPrimary && primaryTotal !== 100) {
    return {
      error: `Primary beneficiaries total ${primaryTotal}%. They need to add up to exactly 100%.`,
    };
  }
  if (contingentTotal !== 0 && contingentTotal !== 100) {
    return {
      error: `Contingent beneficiaries total ${contingentTotal}%. They need to add up to exactly 100% (or 0% if you have none).`,
    };
  }

  for (const r of list) {
    const pct = next.get(r.id) as number;
    if (pct === Number(r.percentage)) continue;
    const { error } = await supabase
      .from("beneficiaries")
      .update({ percentage: pct })
      .eq("id", r.id)
      .eq("entity_id", entityId);
    if (error) return { error: error.message };
  }

  revalidatePath("/profile/beneficiaries");
  return { message: "Percentages saved." };
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
