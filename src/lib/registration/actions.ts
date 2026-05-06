"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RegistrationFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitRegistration(
  noteUuid: string,
  noteHumanId: string,
  _prev: RegistrationFormState | undefined,
  formData: FormData,
): Promise<RegistrationFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const fields = {
    first_name: req(formData, "first_name"),
    last_name: req(formData, "last_name"),
    phone: req(formData, "phone"),
    email: req(formData, "email"),
    entity_type: req(formData, "entity_type"),
    name_for_agreement: req(formData, "name_for_agreement"),
    mailing_address: opt(formData, "mailing_address"),
    city: opt(formData, "city"),
    state: opt(formData, "state"),
    zip_code: opt(formData, "zip_code"),
    investment_amount: req(formData, "investment_amount"),
    acknowledge_lender: formData.get("acknowledge_lender") === "on",
  };

  const fieldErrors: Record<string, string> = {};
  if (!fields.first_name) fieldErrors.first_name = "Required";
  if (!fields.last_name) fieldErrors.last_name = "Required";
  if (!fields.phone) fieldErrors.phone = "Required";
  if (!fields.email) fieldErrors.email = "Required";
  if (!fields.entity_type) fieldErrors.entity_type = "Required";
  if (!fields.name_for_agreement) fieldErrors.name_for_agreement = "Required";
  if (!fields.investment_amount)
    fieldErrors.investment_amount = "Required";
  else if (Number(fields.investment_amount) <= 0)
    fieldErrors.investment_amount = "Must be greater than zero";
  if (!fields.acknowledge_lender)
    fieldErrors.acknowledge_lender =
      "You must acknowledge to submit your registration";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  // Existing lenders self-serve — no admin gate. We insert the
  // note_registrations row (thin audit log of intent + acknowledgment) AND
  // the participations row in awaiting-funding state. Admin gets bank info
  // from the lender off-platform. Once funds clear, the lender already has
  // an account, so no invite step is needed.
  const { error: regErr } = await supabase
    .from("note_registrations")
    .insert({
      note_id: noteUuid,
      user_id: user.id,
      first_name: fields.first_name,
      last_name: fields.last_name,
      phone: fields.phone,
      email: fields.email,
      entity_type: fields.entity_type,
      name_for_agreement: fields.name_for_agreement,
      mailing_address: fields.mailing_address,
      city: fields.city,
      state: fields.state,
      zip_code: fields.zip_code,
      investment_amount: fields.investment_amount,
      acknowledge_lender: fields.acknowledge_lender,
      status: "approved",
    });
  if (regErr) {
    return { error: regErr.message };
  }

  const { error: partErr } = await supabase.from("participations").insert({
    user_id: user.id,
    note_id: noteUuid,
    invested_amount: fields.investment_amount,
    status: "Active",
  });
  if (partErr) {
    return {
      error: `Registration saved but failed to create participation: ${partErr.message}`,
    };
  }

  revalidatePath(`/opportunities/${noteHumanId}`);
  revalidatePath("/notes");
  redirect(`/opportunities/${noteHumanId}?registered=1`);
}

function req(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function opt(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v.length > 0 ? v : null;
}
