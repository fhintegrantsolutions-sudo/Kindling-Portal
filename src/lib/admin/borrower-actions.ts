"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";

export type BorrowerFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createBorrower(
  _prev: BorrowerFormState | undefined,
  formData: FormData,
): Promise<BorrowerFormState> {
  await requireAdmin();
  const supabase = await createClient();

  const fields = parseFields(formData);
  const fieldErrors = validate(fields);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { data, error } = await supabase
    .from("borrowers")
    .insert(fields)
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/admin/borrowers");
  redirect(`/admin/borrowers/${data.id}`);
}

export async function updateBorrower(
  id: string,
  _prev: BorrowerFormState | undefined,
  formData: FormData,
): Promise<BorrowerFormState> {
  await requireAdmin();
  const supabase = await createClient();

  const fields = parseFields(formData);
  const fieldErrors = validate(fields);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { error } = await supabase
    .from("borrowers")
    .update(fields)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/borrowers");
  revalidatePath(`/admin/borrowers/${id}`);
  return {};
}

type Fields = ReturnType<typeof parseFields>;

function parseFields(formData: FormData) {
  return {
    business_name: text(formData, "business_name"),
    contact_name: text(formData, "contact_name"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    address: textOrNull(formData, "address"),
    city: textOrNull(formData, "city"),
    state: textOrNull(formData, "state"),
    zip_code: textOrNull(formData, "zip_code"),
    tax_id: textOrNull(formData, "tax_id"),
    business_type: textOrNull(formData, "business_type"),
    notes: textOrNull(formData, "notes"),
  };
}

function validate(fields: Fields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.business_name) errors.business_name = "Required";
  if (!fields.contact_name) errors.contact_name = "Required";
  if (!fields.email) errors.email = "Required";
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email))
    errors.email = "Enter a valid email";
  if (!fields.phone) errors.phone = "Required";
  return errors;
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function textOrNull(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v.length > 0 ? v : null;
}
