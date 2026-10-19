"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";
import { generateSchedule, noteFirstPaymentFees } from "@/lib/notes/schedule";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Derive one scheduled payment and each funded lender's payout from the note's
// CURRENT terms and fees. Shared by recording and recalculating so both use
// identical math. Payouts come back without note_payment_id.
async function computePayouts(
  supabase: Supabase,
  noteUuid: string,
  paymentNumber: number,
) {
  // Re-derive the schedule from the note so the recorded amounts match
  // exactly what the admin saw on screen (deterministic).
  const { data: note, error: noteErr } = await supabase
    .from("notes")
    .select(
      "principal, rate, term_months, interest_type, first_payment_date, fee, cospark_fee",
    )
    .eq("id", noteUuid)
    .maybeSingle();
  if (noteErr || !note) throw new Error("Note not found");
  if (
    note.principal === null ||
    !note.first_payment_date ||
    !note.term_months ||
    note.rate === null
  ) {
    throw new Error(
      "Note is missing principal, rate, term, or first payment date — cannot generate schedule.",
    );
  }

  const result = generateSchedule({
    principal: Number(note.principal),
    annualRatePct: Number(note.rate),
    termMonths: Number(note.term_months),
    interestType: String(note.interest_type),
    firstPaymentDate: String(note.first_payment_date),
    fee: noteFirstPaymentFees(note),
  });
  if (!result.ok) throw new Error(result.reason);

  const row = result.rows.find((r) => r.payment_number === paymentNumber);
  if (!row) throw new Error("Payment number out of range");

  const { data: participants, error: pErr } = await supabase
    .from("participations")
    .select("id, invested_amount")
    .eq("note_id", noteUuid)
    .eq("funding_cleared", true);
  if (pErr) throw new Error(pErr.message);

  const rows = (participants ?? []).filter(
    (p) => Number(p.invested_amount ?? 0) > 0,
  );
  if (rows.length === 0) {
    throw new Error("No funded participations on this note yet.");
  }
  const totalShare = rows.reduce(
    (sum, p) => sum + Number(p.invested_amount ?? 0),
    0,
  );

  const split = (total: number) => {
    if (total === 0) return rows.map(() => 0);
    const raw = rows.map(
      (p) => (Number(p.invested_amount) / totalShare) * total,
    );
    const rounded = raw.map((v) => Math.round(v * 100) / 100);
    const drift =
      Math.round(total * 100) -
      Math.round(rounded.reduce((s, v) => s + v, 0) * 100);
    if (drift !== 0) {
      let maxIdx = 0;
      for (let i = 1; i < rows.length; i++) {
        if (
          Number(rows[i].invested_amount) > Number(rows[maxIdx].invested_amount)
        ) {
          maxIdx = i;
        }
      }
      rounded[maxIdx] = Math.round(rounded[maxIdx] * 100 + drift) / 100;
    }
    return rounded;
  };
  // Split each lender's TOTAL payment and interest, and take principal as the
  // difference, so a lender's payment is the same every month instead of
  // wobbling a cent from rounding principal and interest separately. Totals
  // still sum exactly: Σprincipal = Σtotal − Σinterest = row principal.
  const totalShares = split(
    Math.round((row.principal_amount + row.interest_amount) * 100) / 100,
  );
  const interestShares = split(row.interest_amount);
  const principalShares = totalShares.map(
    (t, i) => Math.round((t - interestShares[i]) * 100) / 100,
  );
  // The one-time fees (service fee + CoSpark membership, row 1 only): the
  // borrower's note_payment is recorded in FULL, but each lender's payout OUT
  // is reduced by their pro-rata share — from INTEREST only, never principal.
  // Note save rejects fees above the first month's interest, so the cap below
  // is only a guard.
  const feeShares = split(row.fee_amount);

  const payouts = rows.map((p, i) => {
    const feeFromInterest = Math.min(feeShares[i], interestShares[i]);
    return {
      participation_id: p.id,
      principal_amount: principalShares[i],
      interest_amount:
        Math.round((interestShares[i] - feeFromInterest) * 100) / 100,
      share_basis: Number(p.invested_amount),
    };
  });
  return { row, payouts };
}

export async function recordScheduledPayment(
  noteUuid: string,
  paymentNumber: number,
) {
  const adminUser = await requireAdmin();
  const supabase = await createClient();

  const { row, payouts } = await computePayouts(
    supabase,
    noteUuid,
    paymentNumber,
  );

  const { data: payment, error: payErr } = await supabase
    .from("note_payments")
    .insert({
      note_id: noteUuid,
      payment_number: paymentNumber,
      payment_date: row.due_date,
      principal_amount: row.principal_amount,
      interest_amount: row.interest_amount,
      created_by: adminUser.id,
    })
    .select("id")
    .single();
  if (payErr) throw new Error(payErr.message);

  const { error: poErr } = await supabase
    .from("participation_payment_payouts")
    .insert(payouts.map((p) => ({ ...p, note_payment_id: payment.id })));
  if (poErr) {
    await supabase.from("note_payments").delete().eq("id", payment.id);
    throw new Error(poErr.message);
  }

  revalidatePath(`/admin/notes/${noteUuid}`);
  revalidatePath("/notes");
}

// Recompute the lender payouts of an already-recorded payment from the note's
// current fees and funded lenders (e.g. after fees changed post-recording).
// The note_payment row — date, method, check/wire #, notes — is untouched; only
// its participation_payment_payouts are replaced.
export async function recalculateScheduledPayment(
  noteUuid: string,
  paymentNumber: number,
): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  try {
    const { data: payment, error: payErr } = await supabase
      .from("note_payments")
      .select("id")
      .eq("note_id", noteUuid)
      .eq("payment_number", paymentNumber)
      .maybeSingle();
    if (payErr) return { error: payErr.message };
    if (!payment) return { error: "That payment hasn't been recorded." };

    const { payouts } = await computePayouts(supabase, noteUuid, paymentNumber);
    const fresh = payouts.map((p) => ({ ...p, note_payment_id: payment.id }));

    // Keep the old payouts so they can be restored if the insert fails.
    const { data: old, error: oldErr } = await supabase
      .from("participation_payment_payouts")
      .select(
        "note_payment_id, participation_id, principal_amount, interest_amount, share_basis",
      )
      .eq("note_payment_id", payment.id);
    if (oldErr) return { error: oldErr.message };

    const { error: delErr } = await supabase
      .from("participation_payment_payouts")
      .delete()
      .eq("note_payment_id", payment.id);
    if (delErr) return { error: delErr.message };

    const { error: insErr } = await supabase
      .from("participation_payment_payouts")
      .insert(fresh);
    if (insErr) {
      if (old && old.length > 0) {
        await supabase.from("participation_payment_payouts").insert(old);
      }
      return { error: insErr.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to recalculate" };
  }

  revalidatePath(`/admin/notes/${noteUuid}`);
  revalidatePath("/notes");
  revalidatePath("/dashboard");
  return {};
}

export async function unrecordScheduledPayment(
  noteUuid: string,
  paymentNumber: number,
) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("note_payments")
    .delete()
    .eq("note_id", noteUuid)
    .eq("payment_number", paymentNumber);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/notes/${noteUuid}`);
  revalidatePath("/notes");
}

export type UpdatePaymentDetailsState = {
  error?: string;
  message?: string;
};

const FUNDING_TYPES = ["wire", "check", "ach", "other"] as const;

export async function updatePaymentDetails(
  paymentId: string,
  noteUuid: string,
  _prev: UpdatePaymentDetailsState | undefined,
  formData: FormData,
): Promise<UpdatePaymentDetailsState> {
  await requireAdmin();
  const supabase = await createClient();

  const method = String(formData.get("payment_method") ?? "").trim();
  const validMethod = (FUNDING_TYPES as readonly string[]).includes(method)
    ? (method as (typeof FUNDING_TYPES)[number])
    : null;
  const check = String(formData.get("check_number") ?? "").trim() || null;
  const wire = String(formData.get("wire_reference") ?? "").trim() || null;
  const paymentDate = String(formData.get("payment_date") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const update: Record<string, unknown> = {
    payment_method: validMethod,
    check_number: check,
    wire_reference: wire,
    notes,
  };
  if (paymentDate) update.payment_date = paymentDate;

  const { error } = await supabase
    .from("note_payments")
    .update(update)
    .eq("id", paymentId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/notes/${noteUuid}`);
  revalidatePath("/admin/notes/ledger");
  revalidatePath("/notes");
  return { message: "Saved." };
}

