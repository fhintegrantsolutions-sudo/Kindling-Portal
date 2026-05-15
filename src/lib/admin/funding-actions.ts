"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireParticipationsAccess } from "@/lib/dal";

export type FundingFormState = {
  error?: string;
  message?: string;
};

const FUNDING_TYPES = ["wire", "check", "ach", "other"] as const;

export async function updateFundingStatus(
  participationId: string,
  _prev: FundingFormState | undefined,
  formData: FormData,
): Promise<FundingFormState> {
  await requireParticipationsAccess();
  const supabase = await createClient();

  const fundingType = String(formData.get("funding_type") ?? "");
  const validatedFundingType = (FUNDING_TYPES as readonly string[]).includes(
    fundingType,
  )
    ? (fundingType as (typeof FUNDING_TYPES)[number])
    : null;

  const update = {
    funding_received: formData.get("funding_received") === "on",
    funding_deposited: formData.get("funding_deposited") === "on",
    funding_cleared: formData.get("funding_cleared") === "on",
    funding_type: validatedFundingType,
    funding_received_date: dateOrNull(formData, "funding_received_date"),
    funding_deposited_date: dateOrNull(formData, "funding_deposited_date"),
    funding_cleared_date: dateOrNull(formData, "funding_cleared_date"),
    funding_check_number: textOrNull(formData, "funding_check_number"),
    funding_wire_reference_number: textOrNull(
      formData,
      "funding_wire_reference_number",
    ),
    funding_other_type_description: textOrNull(
      formData,
      "funding_other_type_description",
    ),
    funding_notes: textOrNull(formData, "funding_notes"),
  };

  // Light validation: cleared implies deposited implies received.
  if (update.funding_cleared && !update.funding_deposited) {
    return {
      error: "Cannot mark cleared without first marking deposited.",
    };
  }
  if (update.funding_deposited && !update.funding_received) {
    return {
      error: "Cannot mark deposited without first marking received.",
    };
  }

  const { error } = await supabase
    .from("participations")
    .update(update)
    .eq("id", participationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/participations/${participationId}`);
  revalidatePath("/admin/participations");
  revalidatePath("/notes");
  return { message: "Funding status saved." };
}

function dateOrNull(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v.length > 0 ? v : null;
}
function textOrNull(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v.length > 0 ? v : null;
}
