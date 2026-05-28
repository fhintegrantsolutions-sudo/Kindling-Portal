"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RegistrationFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type UpdateInvestmentState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

// Lender-side edit of their own invested_amount. Permitted only before
// funding has been received — once money is in motion the amount is locked
// and only an admin can change it. Enforces the note's minimum investment
// server-side; UI also surfaces the same value as a hint.
export async function updateMyInvestmentAmount(
  participationId: string,
  _prev: UpdateInvestmentState | undefined,
  formData: FormData,
): Promise<UpdateInvestmentState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const raw = String(formData.get("invested_amount") ?? "").trim();
  if (!raw) return { fieldErrors: { invested_amount: "Required" } };
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0)
    return { fieldErrors: { invested_amount: "Must be greater than zero" } };

  const { data: existing } = await supabase
    .from("participations")
    .select(
      `id, user_id, note_id, funding_received,
       note:notes ( note_id, min_investment )`,
    )
    .eq("id", participationId)
    .maybeSingle();
  if (!existing || existing.user_id !== user.id) {
    return { error: "Participation not found." };
  }
  if (existing.funding_received) {
    return {
      error:
        "Funds have already been received on this participation — contact an admin to change the amount.",
    };
  }
  const noteRow = existing.note as unknown as {
    note_id: string;
    min_investment: string | null;
  } | null;
  const min = noteRow?.min_investment ? Number(noteRow.min_investment) : 0;
  if (min > 0 && amount < min) {
    return {
      fieldErrors: {
        invested_amount: `Minimum investment is $${min.toLocaleString()}`,
      },
    };
  }

  const { data: updated, error } = await supabase
    .from("participations")
    .update({ invested_amount: amount.toFixed(2) })
    .eq("id", participationId)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!updated) {
    return {
      error:
        "Update was blocked — refresh and try again, or contact an admin if it persists.",
    };
  }

  // Keep the audit-log registration row in sync so admin views match.
  await supabase
    .from("note_registrations")
    .update({ investment_amount: amount.toFixed(2) })
    .eq("user_id", user.id)
    .eq("note_id", existing.note_id);

  revalidatePath("/notes");
  if (noteRow?.note_id) {
    revalidatePath(`/notes/${noteRow.note_id}`);
    revalidatePath(`/opportunities/${noteRow.note_id}`);
  }
  return { message: "Updated." };
}

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

  // Enforce the note's minimum investment server-side. The form shows it as
  // a label hint, but `min` on the input only blocks at the HTML level if
  // JS is enabled and the user submits normally — direct posts or stale
  // pages can still slip through.
  const { data: noteRow } = await supabase
    .from("notes")
    .select("min_investment")
    .eq("id", noteUuid)
    .maybeSingle();
  const minInvestment = noteRow?.min_investment
    ? Number(noteRow.min_investment)
    : 0;

  const fieldErrors: Record<string, string> = {};
  if (!investment_amount) fieldErrors.investment_amount = "Required";
  else if (Number(investment_amount) <= 0)
    fieldErrors.investment_amount = "Must be greater than zero";
  else if (minInvestment > 0 && Number(investment_amount) < minInvestment)
    fieldErrors.investment_amount = `Minimum investment is $${minInvestment.toLocaleString()}`;
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
