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
  const amountStr = String(formData.get("amount") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const fieldErrors: Record<string, string> = {};
  if (!paid_date) fieldErrors.paid_date = "Required";
  const amount = Number(amountStr);
  if (!amountStr) fieldErrors.amount = "Required";
  else if (!Number.isFinite(amount) || amount <= 0)
    fieldErrors.amount = "Enter a positive amount";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

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
      amount,
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
    payout: (Number(p.invested_amount) / totalShare) * amount,
  }));
  const rounded = raw.map((r) => ({
    ...r,
    payout: Math.round(r.payout * 100) / 100,
  }));
  const drift =
    Math.round(amount * 100) -
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
  return { message: `Recorded $${amount} bonus across ${rows.length} lender(s).` };
}

export async function deleteBonus(bonusId: string, noteUuid: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("note_bonuses").delete().eq("id", bonusId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/notes/${noteUuid}`);
  revalidatePath("/notes");
}
