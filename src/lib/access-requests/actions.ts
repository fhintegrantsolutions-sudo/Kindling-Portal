"use server";

import { createClient } from "@/lib/supabase/server";

export type AccessRequestFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function submitAccessRequest(
  _prev: AccessRequestFormState | undefined,
  formData: FormData,
): Promise<AccessRequestFormState> {
  const fields = {
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    is_tcc_member: formData.get("is_tcc_member") === "on",
    message: String(formData.get("message") ?? "").trim() || null,
    referral_code: String(formData.get("referral_code") ?? "").trim() || null,
  };

  const fieldErrors: Record<string, string> = {};
  if (!fields.first_name) fieldErrors.first_name = "Required";
  if (!fields.last_name) fieldErrors.last_name = "Required";
  if (!fields.email) fieldErrors.email = "Required";
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email))
    fieldErrors.email = "Enter a valid email address";
  if (!fields.phone) fieldErrors.phone = "Required";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.from("access_requests").insert(fields);

  if (error) {
    return { error: "We couldn't submit your request. Please try again." };
  }

  return { success: true };
}
