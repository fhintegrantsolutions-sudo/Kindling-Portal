# Participation Actual Amount Received Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin record the actual amount a lender funded (which becomes the effective `invested_amount` used everywhere), while preserving the originally-submitted amount as an admin-only reference.

**Architecture:** `invested_amount` already drives all downstream math/display, so it holds the ACTUAL amount and an admin can edit it. A new immutable `submitted_amount` column snapshots the original at creation and is shown only on the admin processing page. No downstream calculation changes.

**Tech Stack:** Next.js 16 (server actions, `revalidatePath`), Supabase, TypeScript, React client component. No unit-test framework — verification is `npx tsc --noEmit`, `npm run lint` (ignore ~367 pre-existing `legacy/` errors), a one-off DB check after the migration, and manual smoke testing on the dev server.

**Spec:** [docs/superpowers/specs/2026-06-02-participation-actual-amount-design.md](../specs/2026-06-02-participation-actual-amount-design.md)

**Conventions:** server actions live in `src/lib/admin/*-actions.ts` (`"use server"`, `requireParticipationsAccess()`, `createClient()`, `revalidatePath`). Client action buttons use `useTransition` + `useState` for errors (ref: [invite-button.tsx](../../../src/app/(protected)/admin/participations/[id]/invite-button.tsx)). The Supabase CLI is NOT on PATH — the migration is applied manually (dashboard SQL editor). Latest migration: `20260601000000_funding_archive.sql`.

---

### Task 1: Migration + type

**Files:**
- Create: `supabase/migrations/20260602000000_participation_submitted_amount.sql`
- Modify: `src/lib/db/admin-queries.ts` (the `AdminParticipationDetail` type)

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260602000000_participation_submitted_amount.sql`:

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

- [ ] **Step 2: Apply the migration**

Apply via the Supabase dashboard SQL editor (paste + run).

- [ ] **Step 3: Verify the column + backfill**

In the SQL editor run:

```sql
select count(*) as total,
       count(submitted_amount) as with_submitted,
       count(*) filter (where submitted_amount = invested_amount) as matched
from public.participations;
```

Expected: `total == with_submitted == matched` (every row backfilled to equal `invested_amount`).

- [ ] **Step 4: Add `submitted_amount` to `AdminParticipationDetail`**

In `src/lib/db/admin-queries.ts`, in `export type AdminParticipationDetail = { ... }`, add this line immediately after `invested_amount: string;`:

```ts
  submitted_amount: string | null;
```

(`getParticipationById` selects `*`, so the value flows through automatically once the column exists.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260602000000_participation_submitted_amount.sql src/lib/db/admin-queries.ts
git commit -m "feat(participations): add submitted_amount snapshot column"
```

---

### Task 2: Snapshot at creation + keep it synced on lender self-edit

**Files:**
- Modify: `src/lib/lead/actions.ts` (participation insert ~line 152)
- Modify: `src/lib/registration/actions.ts` (participation insert ~line 197, and `updateMyInvestmentAmount` ~line 71)

- [ ] **Step 1: Lead-flow insert sets the snapshot**

In `src/lib/lead/actions.ts`, the participation insert is:

```ts
  const { error: partErr } = await supabase.from("participations").insert({
    user_id: null,
    note_id: ar.note_id,
    access_request_id: ar.id,
    invested_amount: amountStr,
    status: "Active",
  });
```

Add `submitted_amount: amountStr,` after the `invested_amount` line:

```ts
  const { error: partErr } = await supabase.from("participations").insert({
    user_id: null,
    note_id: ar.note_id,
    access_request_id: ar.id,
    invested_amount: amountStr,
    submitted_amount: amountStr,
    status: "Active",
  });
```

- [ ] **Step 2: Registration-flow insert sets the snapshot**

In `src/lib/registration/actions.ts`, the participation insert is:

```ts
  const { error: partErr } = await supabase.from("participations").insert({
    user_id: user.id,
    note_id: noteUuid,
    invested_amount: investment_amount,
    status: "Active",
  });
```

Add `submitted_amount: investment_amount,`:

```ts
  const { error: partErr } = await supabase.from("participations").insert({
    user_id: user.id,
    note_id: noteUuid,
    invested_amount: investment_amount,
    submitted_amount: investment_amount,
    status: "Active",
  });
```

- [ ] **Step 3: Lender self-edit keeps the snapshot in sync (pre-funding)**

In `src/lib/registration/actions.ts`, `updateMyInvestmentAmount` updates the participation:

```ts
  const { data: updated, error } = await supabase
    .from("participations")
    .update({ invested_amount: amount.toFixed(2) })
    .eq("id", participationId)
    .select("id")
    .maybeSingle();
```

Change the update to also set `submitted_amount` (this path only runs before funds are received, so the snapshot should track the lender's latest commitment):

```ts
  const { data: updated, error } = await supabase
    .from("participations")
    .update({
      invested_amount: amount.toFixed(2),
      submitted_amount: amount.toFixed(2),
    })
    .eq("id", participationId)
    .select("id")
    .maybeSingle();
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/lib/lead/actions.ts src/lib/registration/actions.ts`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lead/actions.ts src/lib/registration/actions.ts
git commit -m "feat(participations): snapshot submitted_amount at creation + lender self-edit"
```

---

### Task 3: Admin edit action

**Files:**
- Modify: `src/lib/admin/funding-actions.ts` (append a new action)

- [ ] **Step 1: Add the action**

Append to `src/lib/admin/funding-actions.ts` (after `saveFundingStatus`):

```ts
// Admin correction of the actual amount received. Updates ONLY invested_amount
// (the effective amount everything uses); leaves submitted_amount and the
// note_registrations row as the original-stated record.
export async function setParticipationInvestedAmount(
  participationId: string,
  amount: string,
): Promise<{ error?: string }> {
  await requireParticipationsAccess();
  const supabase = await createClient();

  const n = Number(String(amount).trim());
  if (!Number.isFinite(n) || n <= 0) {
    return { error: "Enter an amount greater than zero." };
  }

  const { error } = await supabase
    .from("participations")
    .update({ invested_amount: n.toFixed(2) })
    .eq("id", participationId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/participations/${participationId}`);
  revalidatePath("/admin/participations");
  revalidatePath("/notes");
  return {};
}
```

`requireParticipationsAccess`, `createClient`, and `revalidatePath` are already imported in this file.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/lib/admin/funding-actions.ts`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/admin/funding-actions.ts
git commit -m "feat(participations): admin action to set actual amount received"
```

---

### Task 4: Amount-received editor on the participation detail page

**Files:**
- Create: `src/app/(protected)/admin/participations/[id]/amount-received-editor.tsx`
- Modify: `src/app/(protected)/admin/participations/[id]/page.tsx` (render it after the Investment card)

- [ ] **Step 1: Create the editor client component**

Create `src/app/(protected)/admin/participations/[id]/amount-received-editor.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { setParticipationInvestedAmount } from "@/lib/admin/funding-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function fmtUsd(s: string | null): string {
  if (s == null) return "—";
  const n = Number(s);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function AmountReceivedEditor({
  participationId,
  investedAmount,
  submittedAmount,
}: {
  participationId: string;
  investedAmount: string;
  submittedAmount: string | null;
}) {
  const [value, setValue] = useState(investedAmount);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await setParticipationInvestedAmount(participationId, value);
      if (res?.error) setError(res.error);
      else setSaved(true);
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Amount received</CardTitle>
        <span className="text-xs text-muted-foreground">
          Submitted {fmtUsd(submittedAmount)}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-end gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="amount_received">
              Actual amount received (USD)
            </Label>
            <Input
              id="amount_received"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
        {saved ? (
          <p className="text-xs text-muted-foreground">Saved.</p>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Render it on the detail page**

In `src/app/(protected)/admin/participations/[id]/page.tsx`, add the import near the other imports:

```tsx
import { AmountReceivedEditor } from "./amount-received-editor";
```

Then, immediately AFTER the Investment `Card` block (the `{p.note ? ( ... ) : null}` that ends at the line `      ) : null}` following the Rate field), insert:

```tsx
      <AmountReceivedEditor
        participationId={p.id}
        investedAmount={p.invested_amount}
        submittedAmount={p.submitted_amount}
      />
```

(`p.submitted_amount` is available because `getParticipationById` selects `*` and Task 1 added it to the type.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(protected)/admin/participations/[id]/amount-received-editor.tsx" "src/app/(protected)/admin/participations/[id]/page.tsx"`
Expected: no new errors.

- [ ] **Step 4: Manual verification (dev server :3001, migration applied)**

Open a participation detail page. Confirm:
- The "Amount received" card shows "Submitted $X" = the original, and the input defaults to the current invested amount.
- Change the amount → Save → "Saved."; the Investment card "Invested" updates, the participations list amount updates, and the note's "Funded" total reflects it.
- "Submitted" stays unchanged after saving a new amount.
- Entering 0 / blank / negative → shows "Enter an amount greater than zero." and doesn't save.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(protected)/admin/participations/[id]/amount-received-editor.tsx" "src/app/(protected)/admin/participations/[id]/page.tsx"
git commit -m "feat(participations): amount-received editor on admin detail page"
```

---

## Self-review notes

- **Spec coverage:** snapshot column + backfill (Task 1) ✓; set at creation both paths + lender self-edit sync (Task 2) ✓; admin edit action updates only invested_amount (Task 3) ✓; editor showing Submitted + editable Amount received on detail page (Task 4) ✓; no downstream changes (relies on existing invested_amount consumers) ✓; submitted shown admin-only (Task 4, not exposed to client views) ✓.
- **Type consistency:** `submitted_amount: string | null` (type + prop), `setParticipationInvestedAmount(participationId, amount)`, `AmountReceivedEditor({ participationId, investedAmount, submittedAmount })` used identically across tasks.
- **No test framework:** migration verified by SQL count query (Task 1 Step 3); behavior verified manually.
- **Migration is a manual apply** (Task 1 Step 2) — the feature's editor works only after it's applied; until then `p.submitted_amount` is null and the UI shows "Submitted —", which is graceful.
