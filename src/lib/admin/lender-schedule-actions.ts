"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/dal";
import { getMyScheduleForNote, type MyScheduleRow } from "@/lib/db/queries";

export type LenderSchedulePdfData = {
  rows: MyScheduleRow[];
  noteId: string;
  noteTitle: string;
  lenderName: string;
  invested: string;
  annualRatePct: number;
  termMonths: number;
  interestType: string;
  startDate: string | null;
  oneTimeFee: number;
};

// Everything the lender's own "Download PDF" uses, built for an admin from a
// participation id. Same schedule query (getMyScheduleForNote) and the same
// lender-name rule as the lender's note page, so the PDF matches exactly what
// the lender downloads.
export async function getLenderSchedulePdfData(
  participationId: string,
): Promise<{ data?: LenderSchedulePdfData; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("participations")
    .select(
      `id, user_id, invested_amount,
       entity:investor_entities ( loan_agreement_title ),
       note:notes ( id, note_id, title, rate, term_months, interest_type, first_payment_date )`,
    )
    .eq("id", participationId)
    .maybeSingle();
  const row = p as unknown as {
    id: string;
    user_id: string | null;
    invested_amount: string | number;
    entity: { loan_agreement_title: string | null } | null;
    note: {
      id: string;
      note_id: string;
      title: string;
      rate: string | number | null;
      term_months: number | null;
      interest_type: string | null;
      first_payment_date: string | null;
    } | null;
  } | null;
  if (!row || !row.note) return { error: "Participation not found." };

  const schedule = await getMyScheduleForNote(row.note.id, row.id);
  if (!schedule.ok) return { error: schedule.reason };

  let profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null = null;
  if (row.user_id) {
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", row.user_id)
      .maybeSingle();
    profile = data;
  }
  const lenderName =
    (row.entity?.loan_agreement_title ?? "").trim() ||
    [profile?.first_name ?? "", profile?.last_name ?? ""]
      .filter(Boolean)
      .join(" ") ||
    profile?.email ||
    "Lender";

  return {
    data: {
      rows: schedule.rows,
      noteId: row.note.note_id,
      noteTitle: row.note.title,
      lenderName,
      invested: String(row.invested_amount),
      annualRatePct: Number(row.note.rate ?? 0),
      termMonths: Number(row.note.term_months ?? 0),
      interestType: String(row.note.interest_type ?? ""),
      startDate: row.note.first_payment_date ?? null,
      oneTimeFee: schedule.one_time_fee,
    },
  };
}
