// Calendar-year rollup of principal + interest. Pure and framework-free so both
// the per-note and dashboard tables share one source of truth — and a future
// CSV export can reuse it verbatim. No rounding is assumed on the input; the
// output is rounded to cents.

export type MonthlyPI = {
  // Any date whose first 4 chars are the calendar year, e.g. "2026-07-15" or
  // "2026-07". The rollup only reads the year.
  date: string;
  principal: number;
  interest: number;
};

export type AnnualSummaryRow = {
  year: number;
  principal: number;
  interest: number;
  total: number;
};

export type AnnualSummary = {
  rows: AnnualSummaryRow[];
  totals: { principal: number; interest: number; total: number };
};

const cents = (n: number) => Math.round(n * 100) / 100;

export function rollupByYear(months: MonthlyPI[]): AnnualSummary {
  const byYear = new Map<number, { principal: number; interest: number }>();
  for (const m of months) {
    const year = Number(m.date.slice(0, 4));
    if (!Number.isFinite(year)) continue;
    const cur = byYear.get(year) ?? { principal: 0, interest: 0 };
    cur.principal += m.principal;
    cur.interest += m.interest;
    byYear.set(year, cur);
  }

  const rows: AnnualSummaryRow[] = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, v]) => ({
      year,
      principal: cents(v.principal),
      interest: cents(v.interest),
      total: cents(v.principal + v.interest),
    }));

  const totals = rows.reduce(
    (acc, r) => ({
      principal: cents(acc.principal + r.principal),
      interest: cents(acc.interest + r.interest),
      total: cents(acc.total + r.total),
    }),
    { principal: 0, interest: 0, total: 0 },
  );

  return { rows, totals };
}
