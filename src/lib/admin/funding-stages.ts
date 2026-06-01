// Pure, framework-free funding-stage rules. Imported by BOTH the client form
// (funding-form.tsx) and the server action (funding-actions.ts), so this file
// must stay free of "use client"/"use server"/server-only and any I/O.

export type FundingValues = {
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

export const FUNDING_TYPES = ["wire", "check", "ach", "other"] as const;

// Wire and ACH are electronic — they go received -> cleared with no deposit
// step. Everything else (check, other, or no type yet) uses all three stages.
export function requiresDeposit(type: string | null): boolean {
  return !(type === "wire" || type === "ach");
}

// A stage counts as "complete" only when it is both checked and dated.
export function isStageComplete(
  checked: boolean,
  date: string | null,
): boolean {
  return checked && !!date && date.trim().length > 0;
}

// Each funding type surfaces one "method detail" field; the others don't apply
// and are nulled so a type switch can't leave orphaned data:
//   check        -> funding_check_number
//   wire / ach   -> funding_wire_reference_number (labelled per type in the UI)
//   other        -> funding_other_type_description
//   (none)       -> nothing
export function clearUnusedMethodFields(values: FundingValues): FundingValues {
  const v: FundingValues = { ...values };
  const t = v.funding_type;
  if (t !== "check") v.funding_check_number = null;
  if (t !== "wire" && t !== "ach") v.funding_wire_reference_number = null;
  if (t !== "other") v.funding_other_type_description = null;
  return v;
}

// Pure normalizer applied on every client change before saving. Enforces the
// wire/ACH no-deposit rule, gates stages downward (a stage can only stay set
// when its prerequisite is complete), auto-fills a newly-checked stage's date
// with `today`, and clears the date of any unchecked stage. `today` is passed
// in (YYYY-MM-DD) so this stays pure/testable.
export function normalizeFundingValues(
  values: FundingValues,
  today: string,
): FundingValues {
  const v: FundingValues = clearUnusedMethodFields(values);
  const dep = requiresDeposit(v.funding_type);

  // Wire/ACH never have a deposit step.
  if (!dep) {
    v.funding_deposited = false;
    v.funding_deposited_date = null;
  }

  // Gate downward using completeness of each prerequisite.
  const receivedComplete = isStageComplete(
    v.funding_received,
    v.funding_received_date,
  );
  if (!receivedComplete) {
    v.funding_deposited = false;
    v.funding_deposited_date = null;
    v.funding_cleared = false;
    v.funding_cleared_date = null;
  } else if (dep) {
    const depositedComplete = isStageComplete(
      v.funding_deposited,
      v.funding_deposited_date,
    );
    if (!depositedComplete) {
      v.funding_cleared = false;
      v.funding_cleared_date = null;
    }
  }

  // Auto-fill today's date for a checked stage that has no date.
  if (v.funding_received && !v.funding_received_date)
    v.funding_received_date = today;
  if (dep && v.funding_deposited && !v.funding_deposited_date)
    v.funding_deposited_date = today;
  if (v.funding_cleared && !v.funding_cleared_date)
    v.funding_cleared_date = today;

  // Clear the date of any unchecked stage.
  if (!v.funding_received) v.funding_received_date = null;
  if (!v.funding_deposited) v.funding_deposited_date = null;
  if (!v.funding_cleared) v.funding_cleared_date = null;

  return v;
}

// Server-side validation (defense-in-depth; the UI gating already prevents bad
// states). Returns an error string, or null when valid.
export function validateFundingValues(values: FundingValues): string | null {
  if (
    values.funding_type !== null &&
    !(FUNDING_TYPES as readonly string[]).includes(values.funding_type)
  ) {
    return "Invalid funding type.";
  }
  const dep = requiresDeposit(values.funding_type);
  const receivedComplete = isStageComplete(
    values.funding_received,
    values.funding_received_date,
  );
  if (dep) {
    const depositedComplete = isStageComplete(
      values.funding_deposited,
      values.funding_deposited_date,
    );
    if (values.funding_deposited && !receivedComplete) {
      return "Mark funding received (with a date) before deposited.";
    }
    if (values.funding_cleared && !depositedComplete) {
      return "Mark funding deposited (with a date) before cleared.";
    }
  } else if (values.funding_cleared && !receivedComplete) {
    return "Mark funding received (with a date) before cleared.";
  }
  return null;
}
