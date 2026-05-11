"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";

export type BonusFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

// Create a bonus in one of two states:
//   "requested" — admin asked the borrower for the funds. No payouts created
//                 yet. retained_amount is ignored at this stage.
//   "received"  — admin records the funds in hand. Payouts are snapshotted
//                 pro-rata across funded participants.
//
// Hidden `status` form field selects the stage; default is "received" for
// backwards-compat with the existing form.
export async function createBonus(
  noteUuid: string,
  _prev: BonusFormState | undefined,
  formData: FormData,
): Promise<BonusFormState> {
  const adminUser = await requireAdmin();
  const supabase = await createClient();

  const statusRaw = String(formData.get("status") ?? "received").trim();
  const status: "requested" | "received" =
    statusRaw === "requested" ? "requested" : "received";

  const paid_date = String(formData.get("paid_date") ?? "").trim();
  const grossStr = String(formData.get("gross_amount") ?? "").trim();
  const retainedStr = String(formData.get("retained_amount") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const fieldErrors: Record<string, string> = {};
  if (!paid_date) fieldErrors.paid_date = "Required";

  const gross = Number(grossStr);
  if (!grossStr) fieldErrors.gross_amount = "Required";
  else if (!Number.isFinite(gross) || gross <= 0)
    fieldErrors.gross_amount = "Enter a positive amount";

  // Retained only matters at receipt; on a request we coerce it to 0 and
  // skip the validation since the borrower hasn't paid yet.
  const retained =
    status === "received"
      ? retainedStr === ""
        ? 0
        : Number(retainedStr)
      : 0;
  if (status === "received") {
    if (!Number.isFinite(retained) || retained < 0)
      fieldErrors.retained_amount = "Must be 0 or more";
    else if (Number.isFinite(gross) && retained > gross)
      fieldErrors.retained_amount = "Cannot exceed gross amount";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // For requested bonuses we don't touch participations at all.
  if (status === "requested") {
    const { error: bErr } = await supabase.from("note_bonuses").insert({
      note_id: noteUuid,
      paid_date,
      gross_amount: gross,
      retained_amount: 0,
      status,
      notes,
      created_by: adminUser.id,
    });
    if (bErr) return { error: bErr.message };
    revalidatePath(`/admin/notes/${noteUuid}`);
    return {
      message: `Recorded request for $${gross.toFixed(2)}. Mark as received once the borrower pays.`,
    };
  }

  const distributable = Math.round((gross - retained) * 100) / 100;

  // Snapshot eligible participations: funded only.
  const { data: participants, error: pErr } = await supabase
    .from("participations")
    .select("id, invested_amount, funding_cleared")
    .eq("note_id", noteUuid)
    .eq("funding_cleared", true);
  if (pErr) return { error: pErr.message };

  const rows = (participants ?? []).filter(
    (p) => Number(p.invested_amount ?? 0) > 0,
  );
  if (rows.length === 0) {
    return {
      error:
        "No funded participations on this note yet. A bonus needs at least one cleared participant to attribute payouts to.",
    };
  }
  const totalShare = rows.reduce(
    (sum, p) => sum + Number(p.invested_amount ?? 0),
    0,
  );

  const { data: bonus, error: bErr } = await supabase
    .from("note_bonuses")
    .insert({
      note_id: noteUuid,
      paid_date,
      gross_amount: gross,
      retained_amount: retained,
      status,
      notes,
      created_by: adminUser.id,
    })
    .select("id")
    .single();
  if (bErr) return { error: bErr.message };

  const payoutInsert = distributePayouts(rows, totalShare, distributable, bonus.id);
  const { error: payErr } = await supabase
    .from("participation_bonus_payouts")
    .insert(payoutInsert);
  if (payErr) {
    // Best-effort cleanup so we don't leave an orphan bonus.
    await supabase.from("note_bonuses").delete().eq("id", bonus.id);
    return { error: payErr.message };
  }

  revalidatePath(`/admin/notes/${noteUuid}`);
  revalidatePath("/notes");
  const retainedNote =
    retained > 0 ? ` (retained $${retained.toFixed(2)} for ops)` : "";
  return {
    message: `Recorded $${gross.toFixed(2)} bonus${retainedNote}: distributed $${distributable.toFixed(2)} across ${rows.length} lender(s).`,
  };
}

// Flip a requested bonus to received. Admin can adjust gross / retained at
// receipt — the requested amount and the actual amount may differ.
export async function markBonusReceived(
  bonusId: string,
  noteUuid: string,
  _prev: BonusFormState | undefined,
  formData: FormData,
): Promise<BonusFormState> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: bonus, error: readErr } = await supabase
    .from("note_bonuses")
    .select("id, status, note_id, gross_amount")
    .eq("id", bonusId)
    .maybeSingle();
  if (readErr || !bonus) return { error: "Bonus not found." };
  if (bonus.status === "received")
    return { error: "This bonus is already marked received." };

  const paid_date = String(formData.get("paid_date") ?? "").trim();
  const grossStr = String(formData.get("gross_amount") ?? "").trim();
  const retainedStr = String(formData.get("retained_amount") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!paid_date) fieldErrors.paid_date = "Required";

  // Default to the requested gross if admin didn't change it.
  const gross = grossStr ? Number(grossStr) : Number(bonus.gross_amount);
  if (!Number.isFinite(gross) || gross <= 0)
    fieldErrors.gross_amount = "Enter a positive amount";

  const retained = retainedStr === "" ? 0 : Number(retainedStr);
  if (!Number.isFinite(retained) || retained < 0)
    fieldErrors.retained_amount = "Must be 0 or more";
  else if (Number.isFinite(gross) && retained > gross)
    fieldErrors.retained_amount = "Cannot exceed gross amount";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const distributable = Math.round((gross - retained) * 100) / 100;

  const { data: participants, error: pErr } = await supabase
    .from("participations")
    .select("id, invested_amount")
    .eq("note_id", bonus.note_id)
    .eq("funding_cleared", true);
  if (pErr) return { error: pErr.message };
  const rows = (participants ?? []).filter(
    (p) => Number(p.invested_amount ?? 0) > 0,
  );
  if (rows.length === 0) {
    return { error: "No funded participations to distribute to." };
  }
  const totalShare = rows.reduce(
    (sum, p) => sum + Number(p.invested_amount ?? 0),
    0,
  );

  // Update bonus first so the distribution snapshot ties to the new values.
  const { error: uErr } = await supabase
    .from("note_bonuses")
    .update({
      status: "received",
      paid_date,
      gross_amount: gross,
      retained_amount: retained,
    })
    .eq("id", bonusId);
  if (uErr) return { error: uErr.message };

  const payoutInsert = distributePayouts(rows, totalShare, distributable, bonusId);
  const { error: payErr } = await supabase
    .from("participation_bonus_payouts")
    .insert(payoutInsert);
  if (payErr) {
    // Roll the status back so the user can retry.
    await supabase
      .from("note_bonuses")
      .update({ status: "requested" })
      .eq("id", bonusId);
    return { error: payErr.message };
  }

  revalidatePath(`/admin/notes/${noteUuid}`);
  revalidatePath("/admin/notes/bonus-ledger");
  revalidatePath("/notes");
  return {
    message: `Marked received: distributed $${distributable.toFixed(2)} across ${rows.length} lender(s).`,
  };
}

function distributePayouts(
  rows: Array<{ id: unknown; invested_amount: string | number }>,
  totalShare: number,
  distributable: number,
  bonusId: string,
) {
  const raw = rows.map((p) => ({
    participation_id: p.id as string,
    share_basis: Number(p.invested_amount),
    payout: (Number(p.invested_amount) / totalShare) * distributable,
  }));
  const rounded = raw.map((r) => ({
    ...r,
    payout: Math.round(r.payout * 100) / 100,
  }));
  const drift =
    Math.round(distributable * 100) -
    Math.round(rounded.reduce((s, r) => s + r.payout, 0) * 100);
  if (drift !== 0) {
    const largest = rounded.reduce((a, b) =>
      b.share_basis > a.share_basis ? b : a,
    );
    largest.payout = Math.round(largest.payout * 100 + drift) / 100;
  }
  return rounded.map((r) => ({
    bonus_id: bonusId,
    participation_id: r.participation_id,
    amount: r.payout,
    share_basis: r.share_basis,
  }));
}

export type UpdateBonusDetailsState = {
  error?: string;
  message?: string;
};

const FUNDING_TYPES = ["wire", "check", "ach", "other"] as const;

export async function updateBonusDetails(
  bonusId: string,
  noteUuid: string,
  _prev: UpdateBonusDetailsState | undefined,
  formData: FormData,
): Promise<UpdateBonusDetailsState> {
  await requireAdmin();
  const supabase = await createClient();

  const method = String(formData.get("payment_method") ?? "").trim();
  const validMethod = (FUNDING_TYPES as readonly string[]).includes(method)
    ? (method as (typeof FUNDING_TYPES)[number])
    : null;
  const check = String(formData.get("check_number") ?? "").trim() || null;
  const wire = String(formData.get("wire_reference") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await supabase
    .from("note_bonuses")
    .update({
      payment_method: validMethod,
      check_number: check,
      wire_reference: wire,
      notes,
    })
    .eq("id", bonusId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/notes/${noteUuid}`);
  revalidatePath("/admin/notes/bonus-ledger");
  return { message: "Saved." };
}

export async function deleteBonus(bonusId: string, noteUuid: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("note_bonuses").delete().eq("id", bonusId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/notes/${noteUuid}`);
  revalidatePath("/notes");
}
