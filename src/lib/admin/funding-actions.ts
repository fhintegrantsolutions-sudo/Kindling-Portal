"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireParticipationsAccess } from "@/lib/dal";
import {
  clearUnusedMethodFields,
  FUNDING_TYPES,
  requiresDeposit,
  validateFundingValues,
  type FundingValues,
} from "@/lib/admin/funding-stages";
import { getParticipationById } from "@/lib/db/admin-queries";
import { tagParticipantFundsReceived } from "@/lib/ghl/notify-funding";

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

  // Drop method fields that don't belong to the chosen type.
  const cleaned = clearUnusedMethodFields(v);

  const err = validateFundingValues(cleaned);
  if (err) return { error: err };

  // Read the prior received flag so we can fire the lead->participant tag swap
  // only on the false->true edge (this action re-saves the whole sub-object on
  // every autosave, so without this it would re-fire on unrelated edits).
  const { data: prior } = await supabase
    .from("participations")
    .select("funding_received")
    .eq("id", participationId)
    .maybeSingle();

  const { error } = await supabase
    .from("participations")
    .update(cleaned)
    .eq("id", participationId);
  if (error) return { error: error.message };

  // Funds just became received: swap the lender's GHL tags (add "k26003",
  // remove "lead k26003"). Best-effort — never blocks the save.
  if (cleaned.funding_received && !prior?.funding_received) {
    const detail = await getParticipationById(participationId);
    const email = detail?.lender?.email ?? null;
    const noteId =
      (detail as { note?: { note_id?: string | null } } | null)?.note
        ?.note_id ?? null;
    if (email && noteId) {
      await tagParticipantFundsReceived({ email, note_id: noteId });
    }
  }

  revalidatePath(`/admin/participations/${participationId}`);
  revalidatePath("/admin/participations");
  revalidatePath("/notes");
  return {};
}

// Admin correction of the actual amount received. Updates ONLY invested_amount
// (the effective amount everything uses); leaves submitted_amount and the
// note_registrations row as the original-stated record.
export async function setParticipationInvestedAmount(
  participationId: string,
  amount: string,
): Promise<{ error?: string }> {
  await requireParticipationsAccess();
  const supabase = await createClient();

  const n = Number(String(amount).trim());
  if (!Number.isFinite(n) || n <= 0) {
    return { error: "Enter an amount greater than zero." };
  }

  const { error } = await supabase
    .from("participations")
    .update({ invested_amount: n.toFixed(2) })
    .eq("id", participationId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/participations/${participationId}`);
  revalidatePath("/admin/participations");
  revalidatePath("/notes");
  return {};
}
