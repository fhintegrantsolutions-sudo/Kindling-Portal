# Note one-time fee — design

**Status:** Design approved 2026-07-20
**Author:** Haley + Claude

## Problem

Kindling pays a one-time fee on some notes (the practice started with note
K26001). That fee is recovered by subtracting it from the **first month's
payment** to lenders. Today there is no way to record a fee on a note or reflect
it in the payment schedule, so the first month's projected payment overstates
what a lender actually receives.

## Goal

Add a per-note **one-time fee** that is subtracted from the first scheduled
payment, pro-rated across lenders, and shown to lenders (and admins) as an
itemized line on the schedule and the PDF.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Who bears it | Reduces the **lender's** first payment (not just an internal cost) |
| Which notes | **All** note types — interest-only AND amortized |
| From what | The **first month's payment**: interest for interest-only notes, the full monthly payment (principal + interest) for amortized notes |
| Fee larger than the first payment | **Can never exceed** — no carry-over. A validation guard prevents it. |
| Visibility | **Itemized** to every lender (schedule page + PDF), pro-rated to their share; admin sees it at full-note amount |
| Old notes (pre-K26001) | Column is **nullable, no backfill** — old notes stay `null` (= no fee). `null` and `0` behave identically. |

## 1. Data model

Additive migration on `public.notes`:

```sql
alter table public.notes
  add column if not exists fee numeric(14,2);
```

- **Nullable, no default, no backfill.** `null` means "no fee" (old notes and any
  new note without one). `null` and `0` are equivalent for all math and display.
- Mirrors the existing `principal numeric(14,2)` money column.

## 2. Admin note form

- A **"One-time fee"** money field on the note form, shown for **all** note types
  (mirror the `min_investment` / `target_raise` number-field pattern in
  `note-form.tsx`, or the formatted `principal` input — either is fine).
- Parsed via the existing `money(formData, "fee")` helper (strips commas →
  `string | null`); persisted through `buildInsert` (`fee: fields.fee`); both
  `createNote` and `updateNote` route through these, so no other action changes.
- **Validation** (in `validate`): when a fee is present, require
  - `fee >= 0`, and
  - `fee < first month's payment` — computed from row 1 of `generateSchedule`
    for this note's inputs (principal + interest of row 1; for interest-only that
    is the interest, for amortized the full monthly payment). This guarantees the
    net first payment is never negative. Reject with a clear message, e.g.
    "Fee must be less than the first month's payment ($X)."
  - Skip the upper-bound check when the note lacks the inputs needed to compute a
    schedule (no principal/rate/term/first_payment_date) — nothing to validate
    against yet.

## 3. Schedule math (`src/lib/notes/schedule.ts`)

Uniform across note types — no branching on `interest_type`.

- `ScheduleInput` gains `fee?: number`.
- `ScheduleRow` gains `fee_amount: number` — the fee applied to that row. It is
  `fee` on **row 1** (`payment_number === 1`) and `0` on every other row, for both
  interest-only and amortized notes.
- `principal_amount` and `interest_amount` on row 1 are **unchanged** (the true
  gross split). The fee is a separate deduction. The **net payment** for a row is
  `principal_amount + interest_amount − fee_amount`.
- `computeMonthlyPayment` is **NOT** changed — it returns the recurring payment,
  which the one-time fee does not affect.

## 4. Per-lender pro-rata (`getMyScheduleForNote` in `src/lib/db/queries.ts`)

- `MyScheduleRow` gains `my_fee: number`.
- `my_fee = row.fee_amount × myShare` (same `myShare = invested_amount /
  note.principal` already used for `my_principal` / `my_interest`).
- Forward-looking (projected) rows only. Recorded rows read frozen amounts from
  `participation_payment_payouts` and are unaffected — the fee is a projection
  adjustment; once the real first payment is recorded it reflects reality.

## 5. Where it shows

**Itemized** (gross first payment → less one-time fee → net):

- **Lender schedule table** — `src/app/(protected)/notes/[id]/page.tsx`: on the
  first month's row, when `my_fee > 0`, show the gross (`my_principal +
  my_interest`), a "less one-time fee" line/column of `my_fee`, and the net.
- **Lender PDF** — `download-schedule-button.tsx`: same itemization on the row 1
  entry. The summary "scheduled payment" line (recomputed via
  `computeMonthlyPayment`) stays the recurring figure; add a one-line note that
  the first payment is reduced by a one-time fee of `$my_fee`.
- **Admin schedule table** — `schedule-section.tsx` (via `.../schedule/page.tsx`):
  same itemization at full-note amounts (`fee_amount`).
- **Admin PDF** — `download-note-schedule-button.tsx`: same as lender PDF, at
  full-note amounts.

**Net the fee from month 1** (no itemization needed, just correct totals):

- **Dashboard monthly cashflow** — `getMyMonthlyCashflow` (`queries.ts`): the
  month that contains row 1 nets `my_fee` from its projected total.
- **Admin ledger** — `getLedgerForMonth` (`admin-queries.ts`): the first-month
  projected row nets `fee_amount`.

## 6. Deliberately unchanged

Because the fee is one-time, not recurring:

- Stored `notes.monthly_payment` and the form's live monthly preview.
- Admin note-overview "Monthly payment" stat.
- Projected-monthly-income totals (`getMyTotalMonthlyPayment`).
- All recorded/actual payments (`note_payments`,
  `participation_payment_payouts`) — frozen; the fee only touches projections.

## Edge cases

- **Fee = null / 0:** behaves exactly like today — no fee line, `fee_amount = 0`,
  no change to any total.
- **Fee ≥ first payment:** blocked at validation (see §2); cannot be saved, so the
  schedule never has to represent a negative payment.
- **Note missing schedule inputs:** fee is stored but produces no schedule rows
  yet (consistent with how the schedule already no-ops without principal/dates).
- **Amortized vs interest-only:** identical handling — the fee always lands on row
  1's `fee_amount`; the only difference is what the gross row-1 payment is.

## Testing

No unit-test framework; verify with `npx tsc --noEmit`, `npx eslint src`,
`npx next build`, plus targeted checks:

1. `generateSchedule` with a fee: row 1 `fee_amount === fee`; all other rows `0`;
   `principal_amount`/`interest_amount` unchanged vs. no-fee; holds for both
   interest-only and amortized inputs. (A throwaway `tsx` script exercising the
   pure function.)
2. Pro-rata: a lender owning 10% of a note sees `my_fee === fee × 0.10` on row 1.
3. Validation rejects `fee >= first payment` and accepts `fee < first payment`.
4. Manual: enter a fee on a note in the admin form; confirm the itemized line on
   the lender schedule + PDF and the admin schedule + PDF; confirm the dashboard
   cashflow month-1 total drops by the fee; confirm a `null`-fee (old) note is
   visually unchanged.

## Blast radius

One migration, one form field + validation, `generateSchedule` + its two row
types, the pro-rata builder, and ~6 display/aggregate sites. No change to
recurring-payment math or recorded payments.
