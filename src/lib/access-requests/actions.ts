"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeEmail, toProperCase } from "@/lib/text";
import { formatPhone, phoneDigits } from "@/lib/phone";
import { notifyAccessRequestSubmitted } from "@/lib/ghl/notify-access-request";

export type AccessRequestFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function submitAccessRequest(
  _prev: AccessRequestFormState | undefined,
  formData: FormData,
): Promise<AccessRequestFormState> {
  const tcc = String(formData.get("is_tcc_member") ?? "");
  const fields = {
    first_name: toProperCase(String(formData.get("first_name") ?? "")),
    last_name: toProperCase(String(formData.get("last_name") ?? "")),
    email: normalizeEmail(String(formData.get("email") ?? "")),
    phone: String(formData.get("phone") ?? "").trim(),
    is_tcc_member: tcc === "yes",
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
  else if (phoneDigits(fields.phone).length !== 10)
    fieldErrors.phone = "Enter a valid 10-digit phone number";
  if (tcc !== "yes" && tcc !== "no")
    fieldErrors.is_tcc_member = "Please select yes or no";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Store the phone in the canonical (XXX) XXX-XXXX form.
  fields.phone = formatPhone(fields.phone);

  const supabase = await createClient();
  const { error } = await supabase.from("access_requests").insert(fields);

  if (error) {
    return { error: "We couldn't submit your request. Please try again." };
  }

  // Best-effort: sync the lead into GHL (contact + opportunity in the
  // "Request Access" pipeline). Never blocks/fails the request.
  await notifyAccessRequestSubmitted({
    email: fields.email,
    first_name: fields.first_name,
    last_name: fields.last_name,
    phone: fields.phone,
  });

  return { success: true };
}
