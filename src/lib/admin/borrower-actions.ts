"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";
import { normalizeEmail, toProperCase } from "@/lib/text";
import { formatPhone, phoneDigits } from "@/lib/phone";
import { formatZip, isValidZip, normalizeState } from "@/lib/address";

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
    first_name: toProperCase(text(formData, "first_name")),
    last_name: toProperCase(text(formData, "last_name")) || null,
    email: normalizeEmail(text(formData, "email")),
    phone: formatPhone(text(formData, "phone")),
    address: textOrNull(formData, "address"),
    city: toProperCase(text(formData, "city")) || null,
    state: normalizeState(text(formData, "state")) || null,
    zip_code: formatZip(text(formData, "zip_code")) || null,
    tax_id: textOrNull(formData, "tax_id"),
    business_type: textOrNull(formData, "business_type"),
    notes: textOrNull(formData, "notes"),
  };
}

function validate(fields: Fields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.business_name) errors.business_name = "Required";
  if (!fields.first_name) errors.first_name = "Required";
  if (!fields.email) errors.email = "Required";
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email))
    errors.email = "Enter a valid email";
  if (!fields.phone) errors.phone = "Required";
  else if (phoneDigits(fields.phone).length !== 10)
    errors.phone = "Enter a valid 10-digit phone number";
  if (fields.zip_code && !isValidZip(fields.zip_code))
    errors.zip_code = "Enter a valid 5-digit ZIP code";
  return errors;
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function textOrNull(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v.length > 0 ? v : null;
}
