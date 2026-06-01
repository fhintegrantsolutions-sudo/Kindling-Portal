"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireParticipationsAccess } from "@/lib/dal";
import {
  FUNDING_TYPES,
  requiresDeposit,
  validateFundingValues,
  type FundingValues,
} from "@/lib/admin/funding-stages";

// Empty string -> null for nullable text/date columns.
function nn(s: string | null): string | null {
  if (s === null) return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}

export async function saveFundingStatus(
  participationId: string,
  values: FundingValues,
): Promise<{ error?: string }> {
  await requireParticipationsAccess();
  const supabase = await createClient();

  const type = (FUNDING_TYPES as readonly string[]).includes(
    values.funding_type ?? "",
  )
    ? values.funding_type
    : null;

  const v: FundingValues = {
    funding_type: type,
    funding_received: values.funding_received,
    funding_deposited: values.funding_deposited,
    funding_cleared: values.funding_cleared,
    funding_received_date: nn(values.funding_received_date),
    funding_deposited_date: nn(values.funding_deposited_date),
    funding_cleared_date: nn(values.funding_cleared_date),
    funding_check_number: nn(values.funding_check_number),
    funding_wire_reference_number: nn(values.funding_wire_reference_number),
    funding_other_type_description: nn(values.funding_other_type_description),
    funding_notes: nn(values.funding_notes),
  };

  // Wire/ACH have no deposit step — force it off regardless of input.
  if (!requiresDeposit(v.funding_type)) {
    v.funding_deposited = false;
    v.funding_deposited_date = null;
  }

  const err = validateFundingValues(v);
  if (err) return { error: err };

  const { error } = await supabase
    .from("participations")
    .update(v)
    .eq("id", participationId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/participations/${participationId}`);
  revalidatePath("/admin/participations");
  revalidatePath("/notes");
  return {};
}
