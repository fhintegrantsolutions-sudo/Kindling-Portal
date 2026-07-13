"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type LeadFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Token-gated public Server Action. The lead has clicked an emailed setup
 * link and is filling out their own legal-doc info. Verifying the token,
 * we insert a note_registration row (audit trail of what they signed) AND
 * a participations row in awaiting-funding state, both linked back to
 * the access_request. Then we flip the access_request to status=converted.
 *
 * Uses the service-role client so the writes bypass RLS — the access_request
 * status + token serve as the gate instead of auth.uid().
 */
export async function submitLeadParticipationForm(
  token: string,
  _prev: LeadFormState | undefined,
  formData: FormData,
): Promise<LeadFormState> {
  if (!token) return { error: "Missing setup token." };
  const supabase = createAdminClient();

  // 1. Find the access_request and validate token state
  const { data: ar, error: arErr } = await supabase
    .from("access_requests")
    .select("*")
    .eq("setup_token", token)
    .maybeSingle();
  if (arErr || !ar) {
    return {
      error: "This setup link is invalid. Contact your administrator.",
    };
  }
  if (ar.status === "converted") {
    return {
      error:
        "This setup link has already been used. Reach out if you need to make a change.",
    };
  }
  if (ar.status !== "approved") {
    return {
      error: "This setup link is not active.",
    };
  }
  if (
    ar.setup_token_expires_at &&
    new Date(ar.setup_token_expires_at) < new Date()
  ) {
    return {
      error:
        "This setup link has expired. Ask your administrator for a fresh link.",
    };
  }
  if (!ar.note_id) {
    return {
      error: "This access request is missing a note — admin needs to re-approve.",
    };
  }

  // 2. Validate fields
  const amountRaw = text(formData, "investment_amount");
  const amount = amountRaw ? Number(amountRaw) : NaN;
  const entityChoice = text(formData, "entity_type_choice");
  const entityOther = text(formData, "entity_type_other");
  // Resolved entity type: either the dropdown value, or the typed "other"
  // value when the user picked Other.
  const entityType =
    entityChoice === "Other" ? entityOther : entityChoice;
  const fields = {
    investment_amount: amountRaw,
    entity_type: entityType,
    business_name: text(formData, "business_name"),
    name_for_agreement: text(formData, "name_for_agreement"),
    mailing_address: text(formData, "mailing_address"),
    city: text(formData, "city"),
    state: text(formData, "state"),
    zip_code: text(formData, "zip_code"),
    acknowledge_lender: formData.get("acknowledge_lender") === "on",
  };

  const fieldErrors: Record<string, string> = {};
  if (!amountRaw) fieldErrors.investment_amount = "Required";
  else if (!Number.isFinite(amount) || amount <= 0)
    fieldErrors.investment_amount = "Enter an amount greater than zero";
  if (!entityChoice) fieldErrors.entity_type = "Required";
  else if (entityChoice === "Other" && !entityOther)
    fieldErrors.entity_type_other = "Specify the entity type";
  if (entityChoice && entityChoice !== "Individual" && !fields.business_name)
    fieldErrors.business_name = "Required for non-Individual entities";
  if (!fields.name_for_agreement) fieldErrors.name_for_agreement = "Required";
  if (!fields.mailing_address) fieldErrors.mailing_address = "Required";
  if (!fields.city) fieldErrors.city = "Required";
  if (!fields.state) fieldErrors.state = "Required";
  if (!fields.zip_code) fieldErrors.zip_code = "Required";
  if (!fields.acknowledge_lender)
    fieldErrors.acknowledge_lender = "You must acknowledge to submit";

  // Enforce note's min_investment if set
  if (
    !fieldErrors.investment_amount &&
    ar.note_id &&
    Number.isFinite(amount)
  ) {
    const { data: noteRow } = await supabase
      .from("notes")
      .select("min_investment")
      .eq("id", ar.note_id)
      .maybeSingle();
    const min = noteRow?.min_investment
      ? Number(noteRow.min_investment)
      : null;
    if (min !== null && Number.isFinite(min) && amount < min) {
      fieldErrors.investment_amount = `Minimum investment is $${min.toLocaleString()}`;
    }
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const amountStr = amount.toString();

  // 3. Insert the note_registration (audit trail)
  const { error: regErr } = await supabase.from("note_registrations").insert({
    note_id: ar.note_id,
    user_id: null,
    access_request_id: ar.id,
    first_name: ar.first_name,
    last_name: ar.last_name,
    phone: ar.phone,
    email: ar.email,
    entity_type: fields.entity_type,
    business_name: fields.business_name || null,
    name_for_agreement: fields.name_for_agreement,
    mailing_address: fields.mailing_address,
    city: fields.city,
    state: fields.state,
    zip_code: fields.zip_code,
    investment_amount: amountStr,
    acknowledge_lender: fields.acknowledge_lender,
    status: "approved",
  });
  if (regErr) {
    return { error: `Failed to record submission: ${regErr.message}` };
  }

  // 4. Insert the participation (awaiting funding)
  const { error: partErr } = await supabase.from("participations").insert({
    user_id: null,
    note_id: ar.note_id,
    access_request_id: ar.id,
    invested_amount: amountStr,
    submitted_amount: amountStr,
    status: "Active",
  });
  if (partErr) {
    return {
      error: `Submission saved but failed to create participation: ${partErr.message}`,
    };
  }

  // 5. Flip the access_request to converted, persist the lead's chosen amount
  const { error: arUpdateErr } = await supabase
    .from("access_requests")
    .update({
      status: "converted",
      investment_amount: amountStr,
      setup_completed_at: new Date().toISOString(),
    })
    .eq("id", ar.id);
  if (arUpdateErr) {
    return {
      error: `Saved but failed to mark request converted: ${arUpdateErr.message}`,
    };
  }

  // A lead's submission creates a participation and flips the access request, both
  // of which admin acts on. Bust those cached pages so they show up immediately.
  revalidatePath("/admin/participations");
  revalidatePath("/admin/access-requests");
  revalidatePath("/admin");

  redirect(`/setup-participation/${token}/done`);
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
