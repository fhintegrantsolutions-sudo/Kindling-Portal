// A participation's payment range: the inclusive span of the note's payment
// numbers that position receives (participations.first_payment_number /
// last_payment_number). Almost every position is the whole note (1..term,
// last = null). A position TRANSFERRED between lenders mid-note splits it:
// the outgoing lender keeps 1..N (last_payment_number = N, status
// "Transferred") and the incoming lender holds N+1..term on the SAME schedule
// basis (same invested_amount), so every payment amount is unchanged.
//
// This is the single place that interprets the range — schedule rows, payout
// recording, bonus splits and admin totals all go through these helpers.

import { generateLenderSchedule, type ScheduleRow } from "./schedule";

// Participation status for a position closed out by a transfer.
export const TRANSFERRED_STATUS = "Transferred";

export type PaymentRange = {
  first: number; // >= 1
  last: number | null; // null = through the end of the note
};

type RangeColumns = {
  first_payment_number?: number | string | null;
  last_payment_number?: number | string | null;
};

// Normalizes the two DB columns (which may be missing from a select, or arrive
// as strings) into a PaymentRange. Missing/invalid first = 1, last = null.
export function paymentRangeOf(p: RangeColumns | null | undefined): PaymentRange {
  const f = Number(p?.first_payment_number ?? 1);
  const first = Number.isInteger(f) && f >= 1 ? f : 1;
  const rawLast = p?.last_payment_number;
  const l = rawLast === null || rawLast === undefined ? NaN : Number(rawLast);
  const last = Number.isInteger(l) && l >= first ? l : null;
  return { first, last };
}

// True when payment #n is one this position receives.
export function isPaymentInRange(range: PaymentRange, n: number): boolean {
  return n >= range.first && (range.last === null || n <= range.last);
}

// Closed out by a transfer: it stops receiving after last_payment_number.
export function isTransferredOut(range: PaymentRange): boolean {
  return range.last !== null;
}

// Took over another lender's position mid-note (starts after payment #1).
export function isTransferredIn(range: PaymentRange): boolean {
  return range.first > 1;
}

// The whole note (1..term) — the normal case, nothing to annotate.
export function isFullRange(range: PaymentRange): boolean {
  return range.first === 1 && range.last === null;
}

// Last payment number this position receives on a note of termMonths.
export function rangeLastPayment(range: PaymentRange, termMonths: number): number {
  return range.last === null ? termMonths : Math.min(range.last, termMonths);
}

// Number of payments in the range on a note of termMonths (51 for #10–60).
export function rangePaymentCount(range: PaymentRange, termMonths: number): number {
  return Math.max(0, rangeLastPayment(range, termMonths) - range.first + 1);
}

// Only the schedule rows this position receives.
export function rowsInRange<T extends { payment_number: number }>(
  rows: T[],
  range: PaymentRange,
): T[] {
  return rows.filter((r) => isPaymentInRange(range, r.payment_number));
}

// The position's starting balance: invested_amount when it starts at #1,
// otherwise the lender schedule's ending balance after payment first-1 (e.g.
// $135,000 at 10.75% / 60 mo after #9 = $119,055.72). `rows` is the
// position's full generateLenderSchedule output.
export function positionStartingBalance(
  range: PaymentRange,
  invested: number,
  rows: Array<Pick<ScheduleRow, "payment_number" | "ending_balance">>,
): number {
  if (range.first <= 1) return invested;
  const prev = rows.find((r) => r.payment_number === range.first - 1);
  return prev ? prev.ending_balance : 0;
}

// positionStartingBalance from the note's terms, for callers that don't
// already have the schedule. The balance doesn't depend on the one-time fee
// (it only reduces payment #1's interest), so no fee inputs are needed.
// Falls back to invested when the note lacks schedule inputs.
export function positionStartingBalanceForTerms(
  range: PaymentRange,
  invested: number,
  note: {
    rate: string | number | null;
    term_months: number | null;
    interest_type: string | null;
    first_payment_date: string | null;
  },
): number {
  if (range.first <= 1 || !(invested > 0)) return invested;
  if (note.rate === null || !note.term_months || !note.first_payment_date) {
    return invested;
  }
  const sched = generateLenderSchedule({
    invested,
    notePrincipal: invested,
    annualRatePct: Number(note.rate),
    termMonths: Number(note.term_months),
    interestType: String(note.interest_type ?? ""),
    firstPaymentDate: String(note.first_payment_date),
    noteFees: 0,
  });
  return sched.ok ? positionStartingBalance(range, invested, sched.rows) : invested;
}

// Status to show for a position: "Transferred" once it has been transferred
// out (even if the status column wasn't updated), else the stored status.
export function positionStatusLabel(status: string, range: PaymentRange): string {
  return isTransferredOut(range) ? TRANSFERRED_STATUS : status;
}

// Short admin annotation for a non-full range, e.g. "Payments #10–60
// (transferred in)" or "Transferred after #9". null for a full-note position.
export function describePaymentRange(
  range: PaymentRange,
  termMonths: number | null,
): string | null {
  if (isFullRange(range)) return null;
  if (range.first === 1 && range.last !== null) {
    return `Transferred after #${range.last}`;
  }
  const end =
    range.last !== null
      ? String(range.last)
      : termMonths && termMonths > 0
        ? String(termMonths)
        : "end";
  return `Payments #${range.first}–${end} (transferred in${
    range.last !== null ? `, transferred after #${range.last}` : ""
  })`;
}
