"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.from("beneficiaries").insert({
    user_id: user.id,
    name: fields.name,
    relation: fields.relation,
    percentage: fields.percentage,
    type: fields.type,
    dob: fields.dob,
    phone: fields.phone,
    address: fields.address,
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

type Fields = {
  name: string;
  relation: string;
  percentage: number;
  type: string;
  dob: string | null;
  phone: string | null;
  address: string | null;
};

function parseFields(formData: FormData): Fields {
  return {
    name: String(formData.get("name") ?? "").trim(),
    relation: String(formData.get("relation") ?? "").trim(),
    percentage: Number(formData.get("percentage") ?? 0),
    type: String(formData.get("type") ?? "Primary").trim() || "Primary",
    dob: textOrNull(formData, "dob"),
    phone: textOrNull(formData, "phone"),
    address: textOrNull(formData, "address"),
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
  return errors;
}

function textOrNull(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v.length > 0 ? v : null;
}
