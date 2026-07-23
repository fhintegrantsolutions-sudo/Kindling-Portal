# Year-by-year principal & interest summary

## Goal

Give lenders a calendar-year rollup of the principal and interest they receive,
in two places:

1. **Per note** — on the lender's note detail page, for that one participation.
2. **Dashboard** — a total summary across all of the lender's funded notes
   (respecting the entity switcher).

## Key decisions (approved 2026-07-23)

- **Year basis:** calendar year (tax-aligned; data is already keyed by calendar
  month).
- **Scope:** full term projection — every year the note pays, not just years
  received to date.
- **Format:** table (`Year · Principal · Interest · Total`) with a bold grand-total
  row. No chart.

## Nature of the change

Pure aggregation. **No schema change and no new DB query.** Both views roll up
figures that are *already computed*:

- Per note: `getMyScheduleForNote()` already returns monthly rows with
  `my_principal`, `my_interest`, `due_date`, `received_date`.
- Dashboard: `getMyMonthlyCashflow()` already returns per-calendar-month
  `{ month, principal, interest }` across all funded notes.

## Components

### Shared helper — `rollupByYear()`

One small pure function (in `src/lib/notes/annual-summary.ts`) that takes
`{ year: number, principal: number, interest: number }`-normalized monthly input
and returns:

```
{
  rows: { year: number; principal: number; interest: number; total: number }[];
  totals: { principal: number; interest: number; total: number };
}
```

Rounded to cents. Years sorted ascending. The math lives here only, so the two
tables can't drift, and a future CSV export can reuse it verbatim.

### `AnnualSummaryTable` (presentational)

Renders the rows + total. Optional per-row status column (Paid / In progress /
Upcoming) that the per-note view supplies and the dashboard omits.

### Per-note view

Under the existing monthly "Payment schedule" card, an "Annual summary" block.
Aggregates the page's `schedule.rows` by `due_date` year. Each year is tagged
from `received_date`:

- **Paid** — every payment in that year has a `received_date`.
- **In progress** — some but not all.
- **Upcoming** — none.

### Dashboard view

Beside the existing monthly cashflow chart, an "Annual summary" table aggregating
`getMyMonthlyCashflow()` by year. Projection-only (the cashflow series has no
per-month received flag), so no status column; the current calendar year is
subtly highlighted.

## Out of scope (YAGNI)

- CSV export — **planned for the future**; the `rollupByYear()` shape is designed
  to feed it, but no export UI is built now.
- Charts (table chosen).
- Per-entity breakdown on the dashboard (the switcher already scopes it).

## Verification

- Throwaway `tsx` check of `rollupByYear()` against a known multi-year schedule
  (annual principal + interest sums equal the monthly sums; totals equal the
  column sums).
- `tsc --noEmit`, `eslint src` (hold the 8-problem baseline), `next build`.
- Eyeball both views against a real multi-year note (e.g. any 60-month note).
