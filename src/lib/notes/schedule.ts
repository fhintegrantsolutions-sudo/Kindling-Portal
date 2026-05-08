// Amortization schedule generation. All money values are JS numbers
// (dollars), rounded to cents on output. Annual rate is given as a percent
// (e.g. 8.5 for 8.5%) to match the way it's stored on notes.

export type ScheduleRow = {
  payment_number: number;
  due_date: string; // YYYY-MM-DD
  principal_amount: number;
  interest_amount: number;
  ending_balance: number;
};

export type ScheduleInput = {
  principal: number;
  annualRatePct: number;
  termMonths: number;
  interestType: string; // "Amortized" or "Interest only"
  firstPaymentDate: string; // YYYY-MM-DD
};

export type ScheduleResult =
  | { ok: true; rows: ScheduleRow[] }
  | { ok: false; reason: string };

// Standard monthly payment formula. Returns null if inputs are insufficient
// (e.g., principal not yet set on a draft note). For interest-only loans,
// "monthly payment" is just the interest portion (principal is returned at
// maturity), which is the figure the lender sees as their recurring check.
export function computeMonthlyPayment(input: {
  principal: number | null;
  annualRatePct: number | null;
  termMonths: number | null;
  interestType: string;
}): number | null {
  const { principal, annualRatePct, termMonths, interestType } = input;
  if (
    principal === null ||
    !Number.isFinite(principal) ||
    principal <= 0 ||
    annualRatePct === null ||
    !Number.isFinite(annualRatePct) ||
    annualRatePct < 0 ||
    termMonths === null ||
    !Number.isInteger(termMonths) ||
    termMonths <= 0
  ) {
    return null;
  }
  const monthlyRate = annualRatePct / 100 / 12;
  if (interestType === "Interest only") {
    return Math.round(principal * monthlyRate * 100) / 100;
  }
  if (monthlyRate === 0) {
    return Math.round((principal / termMonths) * 100) / 100;
  }
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const pmt = (principal * (monthlyRate * factor)) / (factor - 1);
  return Math.round(pmt * 100) / 100;
}

export function generateSchedule(input: ScheduleInput): ScheduleResult {
  const { principal, annualRatePct, termMonths, interestType, firstPaymentDate } =
    input;

  if (!Number.isFinite(principal) || principal <= 0) {
    return { ok: false, reason: "Principal must be greater than zero." };
  }
  if (!Number.isFinite(annualRatePct) || annualRatePct < 0) {
    return { ok: false, reason: "Rate must be zero or greater." };
  }
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    return { ok: false, reason: "Term (months) must be a positive integer." };
  }
  if (!firstPaymentDate || !/^\d{4}-\d{2}-\d{2}$/.test(firstPaymentDate)) {
    return { ok: false, reason: "First payment date is required." };
  }

  const monthlyRate = annualRatePct / 100 / 12;
  const rows: ScheduleRow[] = [];

  if (interestType === "Interest only") {
    // Interest each month; principal returned in the final payment.
    const interest = round2(principal * monthlyRate);
    let balance = principal;
    for (let n = 1; n <= termMonths; n++) {
      const isFinal = n === termMonths;
      const principalPart = isFinal ? balance : 0;
      const interestPart = interest;
      balance = round2(balance - principalPart);
      rows.push({
        payment_number: n,
        due_date: addMonths(firstPaymentDate, n - 1),
        principal_amount: principalPart,
        interest_amount: interestPart,
        ending_balance: balance,
      });
    }
    return { ok: true, rows };
  }

  // Amortized (default). Standard fixed-payment formula.
  let payment: number;
  if (monthlyRate === 0) {
    payment = principal / termMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, termMonths);
    payment = (principal * (monthlyRate * factor)) / (factor - 1);
  }
  const fixedPayment = round2(payment);

  let balance = principal;
  for (let n = 1; n <= termMonths; n++) {
    const isFinal = n === termMonths;
    const interestPart = round2(balance * monthlyRate);
    let principalPart = round2(fixedPayment - interestPart);
    // On the final row, settle whatever balance remains so we don't drift.
    if (isFinal) principalPart = round2(balance);
    balance = round2(balance - principalPart);
    rows.push({
      payment_number: n,
      due_date: addMonths(firstPaymentDate, n - 1),
      principal_amount: principalPart,
      interest_amount: interestPart,
      ending_balance: balance < 0 ? 0 : balance,
    });
  }
  return { ok: true, rows };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Add months to YYYY-MM-DD without crossing month-boundary surprises:
// if the day-of-month doesn't exist in the target month (e.g. Jan 31 +
// 1 month), clamp to the last day of that month.
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map((s) => parseInt(s, 10));
  const targetMonth = m - 1 + months;
  const targetYear = y + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  const yyyy = String(targetYear).padStart(4, "0");
  const mm = String(normalizedMonth + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
