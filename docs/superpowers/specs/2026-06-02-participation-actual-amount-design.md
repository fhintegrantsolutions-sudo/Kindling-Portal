# Participation Actual Amount Received — Design

**Date:** 2026-06-02
**Status:** Approved (pending spec review)

## Problem

A participation's `invested_amount` is the amount the lender stated on their form. Sometimes the **actual amount that arrives differs** (e.g. A Vandelay Co LLC said $2,500 but wired $2,600). The lender can only self-edit before funds are received ([registration/actions.ts:18](../../../src/lib/registration/actions.ts)) — after that there is **no admin path** to correct it. Admins need to record the actual amount received, and that actual amount must drive everything client-facing (their dashboard, paperwork, note participation, distributions).

## Model (from brainstorming)

- **`invested_amount` holds the actual/effective amount.** Everything downstream already reads it — pro-rata bonus payouts, monthly-share math, all "total invested" stats, every display — so the actual amount propagates everywhere with **no downstream code changes**.
- **`submitted_amount` (new) is an immutable snapshot of the originally-stated amount**, shown only to admins during payment processing. The client never sees it.

| | Column | Value | Who sees it |
|---|---|---|---|
| Original stated | `submitted_amount` (new) | 2500, set once at creation | Admin processing view only |
| Actual / effective | `invested_amount` (existing) | 2600 after admin edits it | Everyone (client page, paperwork, distributions, dashboards) |

Rejected alternative: storing the actual in the unused `funding_investment_amount` and keeping `invested_amount` as stated — that would require rewiring ~10 downstream consumers to read the new column, with high risk of an inconsistency if one is missed. Putting the actual in `invested_amount` (which everything already uses) guarantees consistency.

## Schema — one migration

`supabase/migrations/20260602000000_participation_submitted_amount.sql`:

```sql
-- Immutable snapshot of the amount the lender originally committed on their
-- form. invested_amount holds the ACTUAL amount received (admin-editable);
-- submitted_amount preserves the original for the admin processing view.
alter table public.participations
  add column submitted_amount numeric(14,2);

-- Backfill: existing rows have not been admin-corrected, so the current
-- invested_amount IS the originally-submitted amount.
update public.participations
  set submitted_amount = invested_amount
  where submitted_amount is null;
```

(Left nullable; UI falls back to `invested_amount` when `submitted_amount` is null, so no hard NOT NULL constraint is needed.)

## Creation paths — snapshot at insert

- [lead/actions.ts:155](../../../src/lib/lead/actions.ts) — the participation insert adds `submitted_amount: amountStr` alongside `invested_amount: amountStr`.
- [registration/actions.ts:200](../../../src/lib/registration/actions.ts) — the participation insert adds `submitted_amount: investment_amount` alongside `invested_amount: investment_amount`.

The lender self-edit (before funding) continues to update `invested_amount` **and** `submitted_amount` together (they're still "the submitted amount" until funds arrive) — so the snapshot reflects the final pre-funding commitment.

## Admin edit action

New `setParticipationInvestedAmount(participationId, amount)` in `src/lib/admin/funding-actions.ts` (or a sibling admin action file):
- `await requireParticipationsAccess()` (admin / participations_admin).
- Validate: parse amount, must be a finite number `> 0`; else return `{ error }`.
- Update **only** `participations.invested_amount = amount.toFixed(2)` by id. Do **not** touch `submitted_amount` or `note_registrations` (those preserve the original).
- `revalidatePath` the participation detail, the participations list, and `/notes` (mirrors the funding action) so downstream stats refresh.
- Return `{ error?: string }`.

## UI — amount editor on the participation detail page

On [admin/participations/[id]/page.tsx](../../../src/app/(protected)/admin/participations/[id]/page.tsx), near the Investment card / above the funding form, a small client component `AmountReceivedEditor`:
- Shows **"Submitted $X"** read-only (from `submitted_amount ?? invested_amount`).
- An editable **"Amount received"** number input defaulting to `invested_amount`, with a Save button (uses `useTransition`, shows error from the action). Follows the existing `invite-button.tsx` client-action pattern.
- Only rendered for admins (the page is already admin-gated).

`getParticipationById` / the detail query must select `submitted_amount` and expose it on `AdminParticipationDetail` (add `submitted_amount: string | null`).

## Downstream

No changes. Every consumer of `invested_amount` (bonus distribution, monthly-share math, statements, dashboards, displays) automatically reflects the corrected actual amount. Past bonus payouts stored their own share basis and are immutable — correcting an amount affects only future distributions.

## Out of scope
- Showing `submitted_amount` anywhere other than the admin processing page.
- Any change to how distributions/statements compute (they already use `invested_amount`).
- A guard preventing edits at certain stages — admins may correct the amount at any time.

## Testing
- Migration applies; `submitted_amount` exists and is backfilled (verify a few rows have `submitted_amount = invested_amount`).
- Typecheck + lint clean.
- Manual: on a participation, the editor shows Submitted = original; change Amount received → saves; the participations list, note "Funded" total, and the lender-facing amount all reflect the new value; `submitted_amount` stays unchanged; invalid input (0, blank, negative) shows an error and doesn't save.
