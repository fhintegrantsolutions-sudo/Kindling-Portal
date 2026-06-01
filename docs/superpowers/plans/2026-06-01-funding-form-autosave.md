# Funding Form Autosave + Type-Aware Stages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin participation funding form autosave (debounced), with type-aware stages (wire/ACH skip "deposited"), stage gating (can't advance until the prior stage is checked + dated), and date auto-fill on check.

**Architecture:** Extract the stage rules into a pure, framework-free module (`funding-stages.ts`) shared by the client form and the server action. The form becomes fully controlled, normalizes on every change, and debounce-saves via a new typed server action. No remount-on-save (local state is the source of truth).

**Tech Stack:** Next.js 16 (server actions, `revalidatePath`), React (client component, `useState`/`useEffect`/`useRef`), Supabase, TypeScript. No unit-test framework — verification is `npx tsc --noEmit`, `npm run lint` (ignore ~367 pre-existing `legacy/` errors), a one-off runtime check of the pure `normalizeFundingValues`/`validateFundingValues` functions, and manual smoke testing against the dev server.

**Spec:** [docs/superpowers/specs/2026-06-01-funding-form-autosave-design.md](../specs/2026-06-01-funding-form-autosave-design.md)

**Note:** The Method→Stages→Notes section reorder is already applied in the working tree; Task 3 rewrites the whole component and preserves that order.

---

### Task 1: Pure stage-rules module

**Files:**
- Create: `src/lib/admin/funding-stages.ts`

- [ ] **Step 1: Create the module**

```ts
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

// Pure normalizer applied on every client change before saving. Enforces the
// wire/ACH no-deposit rule, gates stages downward (a stage can only stay set
// when its prerequisite is complete), auto-fills a newly-checked stage's date
// with `today`, and clears the date of any unchecked stage. `today` is passed
// in (YYYY-MM-DD) so this stays pure/testable.
export function normalizeFundingValues(
  values: FundingValues,
  today: string,
): FundingValues {
  const v: FundingValues = { ...values };
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
```

- [ ] **Step 2: Runtime-verify the pure logic**

Create a temporary script `scripts/diag-funding.ts`:

```ts
import {
  normalizeFundingValues,
  validateFundingValues,
  type FundingValues,
} from "../src/lib/admin/funding-stages";

const base: FundingValues = {
  funding_type: null,
  funding_received: false,
  funding_deposited: false,
  funding_cleared: false,
  funding_received_date: null,
  funding_deposited_date: null,
  funding_cleared_date: null,
  funding_check_number: null,
  funding_wire_reference_number: null,
  funding_other_type_description: null,
  funding_notes: null,
};
const T = "2026-06-01";
let pass = 0,
  fail = 0;
function check(name: string, cond: boolean) {
  console.log((cond ? "PASS" : "FAIL") + "  " + name);
  cond ? pass++ : fail++;
}

// Wire: checking received fills today and stays a 2-step (no deposited).
let w = normalizeFundingValues(
  { ...base, funding_type: "wire", funding_received: true },
  T,
);
check("wire received auto-dates", w.funding_received_date === T);
check("wire deposited forced false", w.funding_deposited === false);

// Wire: cleared without received complete is gated off.
w = normalizeFundingValues(
  { ...base, funding_type: "wire", funding_cleared: true },
  T,
);
check("wire cleared gated off (no received)", w.funding_cleared === false);

// Wire: received complete -> cleared allowed.
w = normalizeFundingValues(
  {
    ...base,
    funding_type: "wire",
    funding_received: true,
    funding_received_date: T,
    funding_cleared: true,
  },
  T,
);
check("wire cleared ok after received", w.funding_cleared === true);
check("wire validate ok", validateFundingValues(w) === null);

// Check: cleared needs deposited complete.
let c = normalizeFundingValues(
  {
    ...base,
    funding_type: "check",
    funding_received: true,
    funding_received_date: T,
    funding_cleared: true,
  },
  T,
);
check("check cleared gated off without deposited", c.funding_cleared === false);

// Check: clearing received's date cascades later stages off.
c = normalizeFundingValues(
  {
    ...base,
    funding_type: "check",
    funding_received: true,
    funding_received_date: null,
    funding_deposited: true,
    funding_deposited_date: T,
    funding_cleared: true,
    funding_cleared_date: T,
  },
  T,
);
check(
  "check cleared+deposited cascade off when received undated",
  c.funding_deposited === false && c.funding_cleared === false,
);

// validate rejects out-of-order check.
check(
  "validate rejects check cleared w/o deposited",
  validateFundingValues({
    ...base,
    funding_type: "check",
    funding_received: true,
    funding_received_date: T,
    funding_cleared: true,
  }) !== null,
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
```

Run: `npx tsx scripts/diag-funding.ts`
Expected: all PASS, `7 passed, 0 failed`.

- [ ] **Step 3: Delete the diag script and typecheck**

```bash
rm scripts/diag-funding.ts
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin/funding-stages.ts
git commit -m "feat(funding): pure type-aware stage rules (gating, dates, validation)"
```

---

### Task 2: Typed server action

**Files:**
- Modify: `src/lib/admin/funding-actions.ts` (replace `updateFundingStatus` with `saveFundingStatus`)

- [ ] **Step 1: Replace the action**

Replace the entire contents of `src/lib/admin/funding-actions.ts` with:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireParticipationsAccess } from "@/lib/dal";
import {
  FUNDING_TYPES,
  requiresDeposit,
  validateFundingValues,
  type FundingValues,
} from "@/lib/admin/funding-stages";

// Empty string -> null for nullable text/date columns.
function nn(s: string | null): string | null {
  if (s === null) return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}

export async function saveFundingStatus(
  participationId: string,
  values: FundingValues,
): Promise<{ error?: string }> {
  await requireParticipationsAccess();
  const supabase = await createClient();

  const type = (FUNDING_TYPES as readonly string[]).includes(
    values.funding_type ?? "",
  )
    ? values.funding_type
    : null;

  const v: FundingValues = {
    funding_type: type,
    funding_received: values.funding_received,
    funding_deposited: values.funding_deposited,
    funding_cleared: values.funding_cleared,
    funding_received_date: nn(values.funding_received_date),
    funding_deposited_date: nn(values.funding_deposited_date),
    funding_cleared_date: nn(values.funding_cleared_date),
    funding_check_number: nn(values.funding_check_number),
    funding_wire_reference_number: nn(values.funding_wire_reference_number),
    funding_other_type_description: nn(values.funding_other_type_description),
    funding_notes: nn(values.funding_notes),
  };

  // Wire/ACH have no deposit step — force it off regardless of input.
  if (!requiresDeposit(v.funding_type)) {
    v.funding_deposited = false;
    v.funding_deposited_date = null;
  }

  const err = validateFundingValues(v);
  if (err) return { error: err };

  const { error } = await supabase
    .from("participations")
    .update(v)
    .eq("id", participationId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/participations/${participationId}`);
  revalidatePath("/admin/participations");
  revalidatePath("/notes");
  return {};
}
```

- [ ] **Step 2: Update the stale comment reference in actions.ts**

In `src/lib/admin/actions.ts`, find the comment line referencing `updateFundingStatus on participations` and change `updateFundingStatus` to `saveFundingStatus` so the doc stays accurate. (If the comment differs, just make it name `saveFundingStatus`.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors ONLY in `funding-form.tsx` (it still imports the removed `updateFundingStatus`/`FundingFormState`) — those are fixed in Task 3. No other files should error.

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin/funding-actions.ts src/lib/admin/actions.ts
git commit -m "feat(funding): typed saveFundingStatus action with type-aware validation"
```

---

### Task 3: Controlled autosaving form

**Files:**
- Modify (full rewrite): `src/app/(protected)/admin/participations/[id]/funding-form.tsx`

First READ `src/app/(protected)/admin/participations/[id]/page.tsx` to confirm it passes `defaults` whose object shape exactly matches `FundingValues` (same 11 fields). If the page imports a `FundingDefaults` type from this file, update that import to `FundingValues` from `@/lib/admin/funding-stages`.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/app/(protected)/admin/participations/[id]/funding-form.tsx` with:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { saveFundingStatus } from "@/lib/admin/funding-actions";
import {
  normalizeFundingValues,
  requiresDeposit,
  type FundingValues,
} from "@/lib/admin/funding-stages";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function todayLocal(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function FundingForm({
  participationId,
  defaults,
}: {
  participationId: string;
  defaults: FundingValues;
}) {
  const [values, setValues] = useState<FundingValues>(defaults);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const valuesRef = useRef(values);
  valuesRef.current = values;
  const firstRender = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void save();
    }, 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  async function save() {
    if (inFlight.current) {
      dirty.current = true;
      return;
    }
    inFlight.current = true;
    const res = await saveFundingStatus(participationId, valuesRef.current);
    inFlight.current = false;
    if (res?.error) {
      setError(res.error);
      setStatus("error");
    } else {
      setError(null);
      setStatus("saved");
    }
    if (dirty.current) {
      dirty.current = false;
      void save();
    }
  }

  function change(patch: Partial<FundingValues>) {
    setValues((prev) =>
      normalizeFundingValues({ ...prev, ...patch }, todayLocal()),
    );
  }

  const dep = requiresDeposit(values.funding_type);
  const receivedComplete =
    values.funding_received && !!values.funding_received_date;
  const depositedComplete =
    values.funding_deposited && !!values.funding_deposited_date;

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4 rounded-lg border bg-card p-6">
        <legend className="px-1 text-sm font-semibold">Method</legend>
        <div className="flex flex-col gap-2">
          <Label htmlFor="funding_type">Funding type</Label>
          <select
            id="funding_type"
            value={values.funding_type ?? ""}
            onChange={(e) =>
              change({ funding_type: e.target.value || null })
            }
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">—</option>
            <option value="wire">Wire</option>
            <option value="check">Check</option>
            <option value="ach">ACH</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Check number"
            value={values.funding_check_number}
            onChange={(v) => change({ funding_check_number: v })}
          />
          <TextField
            label="Wire reference"
            value={values.funding_wire_reference_number}
            onChange={(v) => change({ funding_wire_reference_number: v })}
          />
        </div>
        <TextField
          label="Other (describe)"
          value={values.funding_other_type_description}
          onChange={(v) => change({ funding_other_type_description: v })}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-lg border bg-card p-6">
        <legend className="px-1 text-sm font-semibold">Stages</legend>
        <Stage
          label="Funding received"
          checked={values.funding_received}
          date={values.funding_received_date}
          disabled={false}
          onToggle={(c) => change({ funding_received: c })}
          onDate={(d) => change({ funding_received_date: d })}
        />
        {dep ? (
          <Stage
            label="Funding deposited"
            checked={values.funding_deposited}
            date={values.funding_deposited_date}
            disabled={!receivedComplete}
            onToggle={(c) => change({ funding_deposited: c })}
            onDate={(d) => change({ funding_deposited_date: d })}
          />
        ) : null}
        <Stage
          label="Funding cleared"
          checked={values.funding_cleared}
          date={values.funding_cleared_date}
          disabled={dep ? !depositedComplete : !receivedComplete}
          onToggle={(c) => change({ funding_cleared: c })}
          onDate={(d) => change({ funding_cleared_date: d })}
        />
      </fieldset>

      <fieldset className="rounded-lg border bg-card p-6">
        <legend className="px-1 text-sm font-semibold">Notes</legend>
        <textarea
          rows={3}
          value={values.funding_notes ?? ""}
          onChange={(e) => change({ funding_notes: e.target.value })}
          className="mt-2 w-full rounded-md border bg-background p-2 text-sm"
        />
      </fieldset>

      <div className="text-sm" aria-live="polite">
        {status === "error" ? (
          <span className="text-destructive">{error}</span>
        ) : status === "saving" ? (
          <span className="text-muted-foreground">Saving…</span>
        ) : status === "saved" ? (
          <span className="text-muted-foreground">All changes saved</span>
        ) : (
          <span className="invisible">placeholder</span>
        )}
      </div>
    </div>
  );
}

function Stage({
  label,
  checked,
  date,
  disabled,
  onToggle,
  onDate,
}: {
  label: string;
  checked: boolean;
  date: string | null;
  disabled: boolean;
  onToggle: (checked: boolean) => void;
  onDate: (date: string | null) => void;
}) {
  return (
    <div
      className={
        "flex flex-wrap items-center gap-4" +
        (disabled ? " opacity-50" : "")
      }
    >
      <label className="flex w-44 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
        {label}
      </label>
      <Input
        type="date"
        value={date ?? ""}
        disabled={disabled}
        onChange={(e) => onDate(e.target.value || null)}
        className="w-44"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(protected)/admin/participations/[id]/funding-form.tsx" src/lib/admin/funding-stages.ts src/lib/admin/funding-actions.ts`
Expected: no errors. (If the page imported `FundingDefaults`, the earlier import fix keeps it clean.)

- [ ] **Step 3: Manual verification (dev server on :3001)**

Open a participation funding page and confirm:
- Typing in Check number pauses ~1s then shows "All changes saved" — no cursor jump.
- Type = Wire: Deposited row is hidden; Cleared is disabled until Received is checked.
- Check Received → its date fills with today → Cleared becomes enabled.
- Clear Received's date → Cleared disables and unchecks.
- Type = Check: Deposited appears, gates on Received; Cleared gates on Deposited.
- Switch Wire→Check and back: Deposited row shows/hides; switching to Wire drops any deposited flag.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(protected)/admin/participations/[id]/funding-form.tsx"
git commit -m "feat(funding): autosave funding form with stage gating + date auto-fill"
```

---

## Self-review notes

- **Spec coverage:** type-aware stages + hidden deposited (Task 1 `requiresDeposit`, Task 3 conditional render) ✓; gating + completeness (Task 1 `normalizeFundingValues`/`validateFundingValues`, Task 3 `disabled` props) ✓; date auto-fill/clear (Task 1 normalize) ✓; debounced autosave + status line, button removed, no remount (Task 3) ✓; typed action + type-aware validation, fixes wire bug (Task 2) ✓; section order preserved (Task 3) ✓.
- **Type consistency:** `FundingValues`, `normalizeFundingValues(values, today)`, `validateFundingValues(values)`, `requiresDeposit(type)`, `saveFundingStatus(participationId, values)` are used with identical signatures across tasks.
- **Shared-module purity:** `funding-stages.ts` has no `"use client"`/`"use server"`/`server-only` and no imports — safe to import from both the client form and the server action.
- **No test framework:** the pure logic is verified by the Task 1 runtime script (deleted after); UI behavior is manual.
