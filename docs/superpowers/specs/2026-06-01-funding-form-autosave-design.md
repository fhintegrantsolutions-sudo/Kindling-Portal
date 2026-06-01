# Funding Form Autosave + Type-Aware Stages — Design

**Date:** 2026-06-01
**Status:** Approved (pending spec review)

## Problem

The admin participation **funding form** ([funding-form.tsx](../../../src/app/(protected)/admin/participations/[id]/funding-form.tsx)) requires clicking "Save funding status" to persist. The admin wants it to **autosave**. Along the way we're encoding a real domain rule the form doesn't currently model — the funding **stages depend on the payment type** — which also fixes a latent validation bug.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Trigger | Debounced autosave (~1s after the last change) on any field |
| Save button | Removed; replaced by a status line (`Saving…` / `All changes saved` / error) |
| Stage flow | **Type-aware** (see below) |
| Deposited row for wire/ACH | **Hidden** (checkbox + date) |
| Stage gating | A later stage's checkbox is **disabled** until the prerequisite stage is **complete** (checkbox checked **and** date present). Making a prerequisite incomplete clears the later stages. |
| Date auto-fill | Checking a stage fills its date to **today** if empty; unchecking clears its date |
| Section order | Method → Stages → Notes (already applied) |

## Stage rule (type-aware)

| Funding type | Stages | Deposited shown? |
|---|---|---|
| `wire`, `ach` | received → cleared | **no** |
| `check`, `other`, *(none selected)* | received → deposited → cleared | yes |

Helper: `requiresDeposit(type) = !(type === "wire" || type === "ach")`.

**Completeness:** a stage is **complete** when its checkbox is checked **and** its date is non-empty.

**Gating** — you advance stage by stage; you cannot check a stage until the one before it is complete:
- `received` is always enabled (the first stage).
- For wire/ach: `cleared` is enabled only when `received` is complete.
- For check/other/none: `deposited` is enabled only when `received` is complete; `cleared` is enabled only when `deposited` is complete.
- A disabled stage's checkbox renders greyed/non-interactive.

**Normalization** (pure function applied on every change, before saving) — enforces gating downward and keeps dates consistent:
- When a stage flips **false→true**: if its date is empty, set it to today (`YYYY-MM-DD`, local).
- When a stage flips **true→false**: clear its date.
- If `received` is not complete → force `deposited = false` and `cleared = false` (and clear their dates).
- If `deposited` is not complete (3-step types) → force `cleared = false` (and clear its date).
- If type is wire/ach → force `deposited = false` and clear its date (the row is hidden).
- Clearing an earlier stage's **date** (making it incomplete) therefore cascades the later stages off too.

This makes invalid states unreachable from the UI, so autosave never trips a validation error.

## Autosave mechanics

- The form becomes **controlled**: a single `values` state object holds all fields (booleans, dates, type, text). This replaces the uncontrolled `defaultValue` + `<form action>` + remount-on-save approach (the `key={formKey}` remount hack is **removed** — local state is the source of truth, so nothing remounts mid-typing and the cursor never jumps).
- Every change runs `normalize(values)` (cascade + date sync) → sets state → schedules a **debounced save** (~1000ms) via a `setTimeout` ref, cancelling any pending timer.
- The save calls a new typed server action `saveFundingStatus(participationId, values)`.
- A small in-flight guard prevents overlapping saves: if a change lands while a save is running, save again after it resolves (track "dirty since last save").
- **Status indicator** (replaces the button): local `status` = `idle | saving | saved | error` + optional message. Renders `Saving…`, `All changes saved`, or the error text.

## Server action

New `saveFundingStatus(participationId, values)` in [funding-actions.ts](../../../src/lib/admin/funding-actions.ts), replacing the `useActionState`-style `updateFundingStatus`:

```ts
type FundingValues = {
  funding_type: string | null;
  funding_received: boolean;
  funding_deposited: boolean;
  funding_cleared: boolean;
  funding_received_date: string | null;
  funding_deposited_date: string | null;
  funding_cleared_date: string | null;
  funding_check_number: string | null;
  funding_wire_reference_number: string | null;
  funding_other_type_description: string | null;
  funding_notes: string | null;
};
export async function saveFundingStatus(
  participationId: string,
  values: FundingValues,
): Promise<{ error?: string }>;
```

- `requireParticipationsAccess()` first (unchanged auth).
- Validate `funding_type` against the allowed set (or null).
- **Type-aware validation** (defense-in-depth even though the UI gating prevents bad states). A prerequisite is "complete" when its boolean is true and its date is non-empty:
  - wire/ach: if `cleared` and `received` is not complete → error. Force `deposited = false`.
  - check/other/none: if `deposited` and `received` is not complete → error; if `cleared` and `deposited` is not complete → error.
- Update the row; `revalidatePath` the same three paths as today (`/admin/participations/[id]`, `/admin/participations`, `/notes`).
- Return `{}` or `{ error }`.

The revalidation still refreshes the participations list/buckets so funding-stage changes propagate.

## Data flow

```
change (typing / toggle / type select / date)
  → normalize(values)  [cascade + hide-deposited + date auto-fill/clear]
  → setValues(next); status = "saving (pending)"
  → debounce 1s → saveFundingStatus(id, next)
       ok    → status "All changes saved"
       error → status "error" + message (values stay as the user left them)
```

## Out of scope
- Auto-filling dates for any stage other than on its own check.
- Changing how the participations list / dashboard read funding (untouched).
- Migrating historical rows (existing check rows with deposited=true stay valid).

## Testing
- Typecheck + lint clean.
- Runtime check on the pure `normalize` function (no UI): later stages stay disabled/cleared until the prerequisite is complete (checked + dated); clearing an earlier date cascades later stages off; wire/ach force deposited=false; dates fill on check / clear on uncheck.
- Manual: on a wire, Cleared is disabled until Received is checked+dated; checking Received auto-fills today and enables Cleared; clearing Received's date re-disables and clears Cleared. On a check, Deposited gates on Received and Cleared gates on Deposited. Switch type wire↔check → Deposited row shows/hides and its flag resets. Type a check number → pause → "All changes saved"; no cursor jump while typing.
