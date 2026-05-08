"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RegistrationFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

// Returning lenders self-serve. Personal info is sourced from their profile;
// this action only accepts the investment_amount + acknowledgment from the
// form. If any required profile field is missing the action errors and the
// page directs the lender to complete their profile first.
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

  const investment_amount = String(
    formData.get("investment_amount") ?? "",
  ).trim();
  const acknowledge_lender = formData.get("acknowledge_lender") === "on";

  const fieldErrors: Record<string, string> = {};
  if (!investment_amount) fieldErrors.investment_amount = "Required";
  else if (Number(investment_amount) <= 0)
    fieldErrors.investment_amount = "Must be greater than zero";
  if (!acknowledge_lender)
    fieldErrors.acknowledge_lender =
      "You must acknowledge to submit your registration";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, phone, email, entity_type, loan_agreement_title, address_street, address_city, address_state, address_zip",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return {
      error:
        "Couldn't read your profile. Refresh and try again — or update your profile if it's incomplete.",
    };
  }

  const fn = (profile.first_name as string | null) ?? "";
  const ln = (profile.last_name as string | null) ?? "";
  const fullName = `${fn} ${ln}`.trim();
  const nameForAgreement =
    (profile.loan_agreement_title as string | null) || fullName || null;
  const phone = (profile.phone as string | null) ?? "";
  const email = (profile.email as string | null) ?? user.email ?? "";
  const entityType = (profile.entity_type as string | null) ?? "";

  const missing: string[] = [];
  if (!fn) missing.push("first name");
  if (!ln) missing.push("last name");
  if (!phone) missing.push("phone");
  if (!entityType) missing.push("entity type");
  if (!nameForAgreement) missing.push("name on loan agreement");
  if (missing.length > 0) {
    return {
      error: `Your profile is missing: ${missing.join(", ")}. Update your profile and try again.`,
    };
  }

  const { error: regErr } = await supabase.from("note_registrations").insert({
    note_id: noteUuid,
    user_id: user.id,
    first_name: fn,
    last_name: ln,
    phone,
    email,
    entity_type: entityType,
    name_for_agreement: nameForAgreement!,
    mailing_address: (profile.address_street as string | null) ?? null,
    city: (profile.address_city as string | null) ?? null,
    state: (profile.address_state as string | null) ?? null,
    zip_code: (profile.address_zip as string | null) ?? null,
    investment_amount,
    acknowledge_lender,
    status: "approved",
  });
  if (regErr) return { error: regErr.message };

  const { error: partErr } = await supabase.from("participations").insert({
    user_id: user.id,
    note_id: noteUuid,
    invested_amount: investment_amount,
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
