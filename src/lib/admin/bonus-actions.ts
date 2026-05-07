"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";

export type BonusFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
};

export async function createBonus(
  noteUuid: string,
  _prev: BonusFormState | undefined,
  formData: FormData,
): Promise<BonusFormState> {
  const adminUser = await requireAdmin();
  const supabase = await createClient();

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

  const retained = retainedStr === "" ? 0 : Number(retainedStr);
  if (!Number.isFinite(retained) || retained < 0)
    fieldErrors.retained_amount = "Must be 0 or more";
  else if (Number.isFinite(gross) && retained > gross)
    fieldErrors.retained_amount = "Cannot exceed gross amount";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

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
      notes,
      created_by: adminUser.id,
    })
    .select("id")
    .single();
  if (bErr) return { error: bErr.message };

  // Distribute pro-rata. Round each share to 2 dp; assign any remainder
  // (from rounding) to the largest participation so the sum reconciles.
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
    largest.payout = Math.round((largest.payout * 100 + drift)) / 100;
  }

  const payoutInsert = rounded.map((r) => ({
    bonus_id: bonus.id,
    participation_id: r.participation_id,
    amount: r.payout,
    share_basis: r.share_basis,
  }));
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
