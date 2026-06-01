# Funding Workflow Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin manually archive a note's funding round (per-note, one-way, soft-warning) so completed notes drop out of the active funding workflow without deleting any data.

**Architecture:** Add a nullable `funding_archived_at` timestamp (+ `funding_archived_by`) to the `notes` table. A note is "archived" when that column is set. The admin participations list excludes archived notes from every active bucket and adds an "Archived" filter; an "Archive funding" button on the note Settings tab calls a new admin-only server action. `notes.status` and all lender-facing views are untouched.

**Tech Stack:** Next.js 16 (App Router, server actions, `revalidatePath`), Supabase (Postgres + supabase-js), TypeScript, Tailwind/shadcn UI. **No unit-test framework exists in this repo** — verification per task is `npx tsc --noEmit` (typecheck), `npm run lint`, and manual smoke tests against the dev server already running on http://localhost:3001.

**Spec:** [docs/superpowers/specs/2026-06-01-funding-workflow-archive-design.md](../specs/2026-06-01-funding-workflow-archive-design.md)

**Conventions in this repo (follow them):**
- Server actions live in `src/lib/admin/*-actions.ts`, start with `"use server"`, call `await requireAdmin()` from `@/lib/dal`, mutate via `await createClient()` from `@/lib/supabase/server`, then `revalidatePath(...)`.
- `requireAdmin()` returns the admin's `profile` (has `.id`, which is the auth user id).
- Migrations are plain `.sql` files in `supabase/migrations/`, named `YYYYMMDDHHMMSS_slug.sql`. The Supabase CLI is **not** on PATH here, so the migration is applied manually (Supabase dashboard SQL editor, or `supabase db push` wherever the CLI is configured). Latest existing migration: `20260515000001_participations_lender_update.sql`.
- Client action buttons are `"use client"`, use `useTransition` + `useState` for error, and `confirm(...)` for destructive confirmation. Reference: [src/app/(protected)/admin/participations/[id]/invite-button.tsx](../../../src/app/(protected)/admin/participations/[id]/invite-button.tsx).

---

### Task 1: Schema migration + type

Add the archive columns to `notes` and surface them on the `AdminNoteDetail` type.

**Files:**
- Create: `supabase/migrations/20260601000000_funding_archive.sql`
- Modify: `src/lib/db/admin-queries.ts` (the `AdminNoteDetail` type, ends ~line 1172)

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260601000000_funding_archive.sql`:

```sql
-- Funding workflow archive: a note's funding round can be archived (per-note,
-- one-way) so it drops out of the active admin funding workflow. This is
-- orthogonal to notes.status — archiving does NOT change the note's lifecycle
-- or any lender-facing view.
alter table public.notes
  add column funding_archived_at timestamptz,
  add column funding_archived_by uuid references auth.users(id);

comment on column public.notes.funding_archived_at is
  'When set, the note''s funding round is archived and hidden from the active admin funding workflow. Null = active.';
comment on column public.notes.funding_archived_by is
  'Admin auth user id who archived the funding round.';
```

- [ ] **Step 2: Apply the migration**

Apply via the Supabase dashboard SQL editor (paste the file contents and run), or `supabase db push` wherever the CLI is configured.

- [ ] **Step 3: Verify the columns exist**

In the Supabase SQL editor run:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'notes'
  and column_name in ('funding_archived_at', 'funding_archived_by');
```

Expected: two rows — `funding_archived_at | timestamp with time zone | YES` and `funding_archived_by | uuid | YES`.

- [ ] **Step 4: Add the columns to the `AdminNoteDetail` type**

In `src/lib/db/admin-queries.ts`, inside `export type AdminNoteDetail = { ... }`, add these two lines just before the closing `updated_at: string;` line:

```ts
  funding_archived_at: string | null;
  funding_archived_by: string | null;
```

(`getAdminNoteById` uses `select("*")`, so no query change is needed — the columns flow through automatically.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260601000000_funding_archive.sql src/lib/db/admin-queries.ts
git commit -m "feat(funding-archive): add funding_archived_at columns to notes"
```

---

### Task 2: Archive server action + eligibility helper

Add the admin-only action that stamps the archive columns, plus a small query the Settings page uses to build the soft warning.

**Files:**
- Modify: `src/lib/admin/note-actions.ts` (append a new exported action)
- Modify: `src/lib/db/admin-queries.ts` (append a new exported helper)

- [ ] **Step 1: Add the archive action**

Append to `src/lib/admin/note-actions.ts` (after `updateNote`, before the `// ---` helper divider). It is one-way and idempotent — the `.is("funding_archived_at", null)` guard means a second call is a no-op:

```ts
/**
 * Archive a note's funding round (per-note, one-way). Stamps funding_archived_at
 * so the note's participations drop out of the active admin funding workflow.
 * Does NOT touch notes.status or any lender-facing view. Idempotent: re-archiving
 * an already-archived note is a no-op.
 */
export async function archiveNoteFunding(
  noteUuid: string,
): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notes")
    .update({
      funding_archived_at: new Date().toISOString(),
      funding_archived_by: admin.id,
    })
    .eq("id", noteUuid)
    .is("funding_archived_at", null);
  if (error) return { error: error.message };

  revalidatePath("/admin/participations");
  revalidatePath(`/admin/notes/${noteUuid}`);
  revalidatePath(`/admin/notes/${noteUuid}/settings`);
  revalidatePath("/admin");
  return {};
}
```

- [ ] **Step 2: Add the eligibility helper**

Append to `src/lib/db/admin-queries.ts` (end of file). It reports how many participations on the note have not yet cleared, for the soft warning:

```ts
/**
 * Funding-archive eligibility summary for a note: total participations and how
 * many have not cleared funding yet. Used to build the soft warning on the
 * Settings tab archive button.
 */
export async function getNoteFundingArchiveSummary(
  noteUuid: string,
): Promise<{ total: number; uncleared: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("participations")
    .select("funding_cleared")
    .eq("note_id", noteUuid);
  const rows = (data ?? []) as Array<{ funding_cleared: boolean }>;
  return {
    total: rows.length,
    uncleared: rows.filter((r) => !r.funding_cleared).length,
  };
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors. (`requireAdmin`, `createClient`, `revalidatePath` are already imported at the top of `note-actions.ts`.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin/note-actions.ts src/lib/db/admin-queries.ts
git commit -m "feat(funding-archive): add archiveNoteFunding action + eligibility summary"
```

---

### Task 3: Surface `funding_archived_at` in the participations list query

Add the archive flag to the per-participation note sub-select and the list type so the page can filter on it.

**Files:**
- Modify: `src/lib/db/admin-queries.ts` — `getParticipations` select (~line 256) and `AdminParticipationListItem` type (~line 227)

- [ ] **Step 1: Add `funding_archived_at` to the note sub-select**

In `getParticipations`, change the note line of the `.select(...)` string from:

```ts
      note:notes ( note_id, title )
```

to:

```ts
      note:notes ( note_id, title, funding_archived_at )
```

- [ ] **Step 2: Add the field to the list type**

In `export type AdminParticipationListItem = { ... }`, change:

```ts
  note: { note_id: string; title: string } | null;
```

to:

```ts
  note: {
    note_id: string;
    title: string;
    funding_archived_at: string | null;
  } | null;
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (The page reads `p.note?.note_id` / `p.note?.title` — still valid.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/admin-queries.ts
git commit -m "feat(funding-archive): expose funding_archived_at on participation list rows"
```

---

### Task 4: Participations list — exclude archived + add "Archived" filter

Archived notes' participations leave every active bucket and appear only under a new "Archived" filter, grouped by note.

**Files:**
- Modify: `src/app/(protected)/admin/participations/page.tsx`

- [ ] **Step 1: Add `archived` to the filter union and import an icon**

Change the `FilterValue` type (lines 19-25) to add `"archived"`:

```ts
type FilterValue =
  | "all"
  | "awaiting_funding"
  | "received"
  | "deposited"
  | "cleared"
  | "awaiting_invite"
  | "archived";
```

In the `lucide-react` import block (lines 2-9), add `Archive` to the imported icons:

```ts
import {
  Archive,
  Banknote,
  CheckCircle2,
  CircleDashed,
  Hourglass,
  Layers,
  UserPlus,
} from "lucide-react";
```

- [ ] **Step 2: Split active vs archived, and build the visible list**

Replace the body from `const allParticipations = await getParticipations();` (line 34) through the end of the `participations` declaration (line 67) with:

```ts
  const allParticipations = await getParticipations();

  const isArchived = (p: { note: { funding_archived_at: string | null } | null }) =>
    p.note?.funding_archived_at != null;

  // Active workflow excludes archived notes entirely; the Archived filter shows
  // only those.
  const active = allParticipations.filter((p) => !isArchived(p));
  const archived = allParticipations.filter(isArchived);

  const matchesStage = (p: {
    funding_received: boolean;
    funding_deposited: boolean;
    funding_cleared: boolean;
    user_id: string | null;
  }): boolean => {
    switch (filter) {
      case "awaiting_funding":
        return !p.funding_received;
      case "received":
        return p.funding_received && !p.funding_deposited;
      case "deposited":
        return p.funding_deposited && !p.funding_cleared;
      case "cleared":
        return p.funding_cleared;
      case "awaiting_invite":
        return p.funding_cleared && p.user_id === null;
      case "all":
      default:
        return true;
    }
  };

  const byLender = (
    a: { lender_name: string | null; lender_email: string | null },
    b: { lender_name: string | null; lender_email: string | null },
  ) => {
    const an = (a.lender_name ?? a.lender_email ?? "~").toLowerCase();
    const bn = (b.lender_name ?? b.lender_email ?? "~").toLowerCase();
    return an.localeCompare(bn);
  };

  // Archived view: sort by note_id then lender so same-note rows group together.
  // Active views: filter by funding stage, sort by lender.
  const participations =
    filter === "archived"
      ? [...archived].sort((a, b) => {
          const noteCmp = (a.note?.note_id ?? "~").localeCompare(
            b.note?.note_id ?? "~",
          );
          return noteCmp !== 0 ? noteCmp : byLender(a, b);
        })
      : active.filter(matchesStage).sort(byLender);
```

- [ ] **Step 3: Compute counts over the active set, plus an archived count**

Replace the `counts` object (lines 69-83) with:

```ts
  const counts = {
    all: active.length,
    awaiting_funding: active.filter((p) => !p.funding_received).length,
    received: active.filter(
      (p) => p.funding_received && !p.funding_deposited,
    ).length,
    deposited: active.filter(
      (p) => p.funding_deposited && !p.funding_cleared,
    ).length,
    cleared: active.filter((p) => p.funding_cleared).length,
    awaiting_invite: active.filter(
      (p) => p.funding_cleared && p.user_id === null,
    ).length,
    archived: archived.length,
  };
```

Also change `clearedInvested` (lines 85-87) to compute over `active` so archived dollars don't inflate the active band:

```ts
  const clearedInvested = active
    .filter((p) => p.funding_cleared)
    .reduce((sum, p) => sum + Number(p.invested_amount), 0);
```

- [ ] **Step 4: Add the "Archived" stat tile**

In the `<section>` of stat tiles, immediately after the "Awaiting invite" `<Stat ... />` block (ends ~line 143), add:

```tsx
        <Stat
          label="Archived"
          value={String(counts.archived)}
          icon={<Archive className="size-4" />}
          href="/admin/participations?funding=archived"
          active={filter === "archived"}
        />
```

- [ ] **Step 5: Show the archived date on rows when viewing the Archived filter**

In the row card header, the eyebrow line currently reads (lines 166-169):

```tsx
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {p.note?.note_id} ·{" "}
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
```

Replace it with a version that appends the archived date when archived:

```tsx
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {p.note?.note_id} ·{" "}
                        {new Date(p.created_at).toLocaleDateString()}
                        {p.note?.funding_archived_at
                          ? ` · Archived ${new Date(
                              p.note.funding_archived_at,
                            ).toLocaleDateString()}`
                          : ""}
                      </p>
```

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors.

- [ ] **Step 7: Manual verification**

With the dev server running (http://localhost:3001), open `/admin/participations`. Confirm: the new "Archived" tile appears; the default and stage filters look unchanged (no note is archived yet, so Archived shows 0 and the active buckets are unchanged). Full archive behavior is verified end-to-end in Task 5.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(protected)/admin/participations/page.tsx"
git commit -m "feat(funding-archive): exclude archived from active buckets, add Archived filter"
```

---

### Task 5: Archive button on the note Settings tab (+ end-to-end verification)

A client button on the Settings tab calls `archiveNoteFunding`, with a soft warning if the note isn't Active or some participations haven't cleared. Once archived it shows a confirmation badge instead of the button.

**Files:**
- Create: `src/app/(protected)/admin/notes/[id]/settings/archive-funding-button.tsx`
- Modify: `src/app/(protected)/admin/notes/[id]/settings/page.tsx`

- [ ] **Step 1: Create the archive button client component**

Create `src/app/(protected)/admin/notes/[id]/settings/archive-funding-button.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { archiveNoteFunding } from "@/lib/admin/note-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ArchiveFundingButton({
  noteId,
  archivedAt,
  warnings,
}: {
  noteId: string;
  archivedAt: string | null;
  warnings: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (archivedAt) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-muted bg-muted/30 p-6">
        <p className="text-sm font-medium">Funding archived</p>
        <p className="text-xs text-muted-foreground">
          ✓ Archived {new Date(archivedAt).toLocaleDateString()}. This note no
          longer appears in the active funding workflow. Its records remain in
          the &ldquo;Archived&rdquo; filter and on this page.
        </p>
      </div>
    );
  }

  const archive = () => {
    const prompt =
      warnings.length > 0
        ? `Archive this note's funding round?\n\n${warnings
            .map((w) => `• ${w}`)
            .join(
              "\n",
            )}\n\nArchiving is one-way and removes it from the active funding workflow. Continue?`
        : "Archive this note's funding round? This is one-way and removes it from the active funding workflow.";
    if (!confirm(prompt)) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await archiveNoteFunding(noteId);
        if (result?.error) setError(result.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to archive");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Archive funding workflow</p>
          <p className="text-xs text-muted-foreground">
            Removes this note from the active admin funding workflow once it is
            fully funded and live. One-way; does not change the note&apos;s
            status or any lender view.
          </p>
          {warnings.length > 0 ? (
            <ul className="mt-2 list-disc pl-4 text-xs text-amber-600">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={archive}
        >
          {pending ? "Working…" : "Archive funding"}
        </Button>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Wire the button into the Settings page**

Replace the contents of `src/app/(protected)/admin/notes/[id]/settings/page.tsx` with the version below. Changes: import `getNoteFundingArchiveSummary` and the button, fetch the summary, compute `warnings`, and render the button above the form.

```tsx
import { notFound } from "next/navigation";
import {
  getAdminNoteById,
  getBorrowersForPicker,
  getLendersForPicker,
  getNoteFundingArchiveSummary,
  getNoteVisibility,
} from "@/lib/db/admin-queries";
import { NoteForm } from "../../note-form";
import { ArchiveFundingButton } from "./archive-funding-button";

export default async function NoteSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [note, borrowers, lenders, visibleUserIds, archiveSummary] =
    await Promise.all([
      getAdminNoteById(id),
      getBorrowersForPicker(),
      getLendersForPicker(),
      getNoteVisibility(id),
      getNoteFundingArchiveSummary(id),
    ]);
  if (!note) notFound();

  const warnings: string[] = [];
  if (note.status !== "Active") {
    warnings.push(`Note status is "${note.status}", not Active.`);
  }
  if (archiveSummary.uncleared > 0) {
    warnings.push(
      `${archiveSummary.uncleared} of ${archiveSummary.total} participation(s) have not cleared funding yet.`,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ArchiveFundingButton
        noteId={note.id}
        archivedAt={note.funding_archived_at}
        warnings={warnings}
      />
      <NoteForm
        noteId={note.id}
        borrowers={borrowers}
        lenders={lenders}
        visibleUserIds={visibleUserIds}
        defaults={{
          note_id: note.note_id,
          title: note.title,
          borrower_id: note.borrower_id,
          project_type: note.project_type,
          type: note.type,
          interest_type: note.interest_type,
          is_private: note.is_private,
          principal: note.principal,
          rate: note.rate,
          term_months: String(note.term_months),
          min_investment: note.min_investment,
          target_raise: note.target_raise,
          monthly_payment: note.monthly_payment,
          contract_date: note.contract_date,
          first_payment_date: note.first_payment_date,
          maturity_date: note.maturity_date,
          funding_start_date: note.funding_start_date,
          funding_end_date: note.funding_end_date,
          description: note.description,
          admin_notes: note.admin_notes,
          status: note.status,
          client_status: note.client_status,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors.

- [ ] **Step 4: Manual end-to-end verification**

With the dev server running, pick a note that has at least one participation:

1. Go to `/admin/participations` — note which bucket(s) the note's participations sit in, and the Archived count (should be 0).
2. Go to that note's Settings tab (`/admin/notes/<id>/settings`). The "Archive funding workflow" card shows. If the note isn't Active or has uncleared participations, the amber warnings list those reasons (soft — the button is still enabled).
3. Click **Archive funding**, confirm the dialog.
4. Back on `/admin/participations`: the note's participations are gone from the active buckets, the active counts dropped accordingly, and the **Archived** tile count went up. Click **Archived** — the note's rows show there, grouped by note, each with an "Archived {date}" eyebrow.
5. Return to the note's Settings tab — the card now shows "Funding archived ✓ {date}" instead of the button.
6. Confirm the note's Overview tab still lists its funded participants (archiving does not hide note-level records), and that `notes.status` / lender-facing views are unchanged.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(protected)/admin/notes/[id]/settings/archive-funding-button.tsx" "src/app/(protected)/admin/notes/[id]/settings/page.tsx"
git commit -m "feat(funding-archive): add Archive funding button to note Settings tab"
```

---

## Self-review notes

- **Spec coverage:** schema (Task 1) ✓; manual per-note one-way action with soft warning (Task 2 + Task 5) ✓; active buckets exclude archived + Archived filter grouped by note (Task 4) ✓; button on Settings tab + archived badge (Task 5) ✓; records remain visible on participations Archived filter and on note detail (Task 4 step 5, Task 5 — note Overview unaffected) ✓; `notes.status` untouched (action only writes the two new columns) ✓; audit_logs left out (no existing pattern) — matches spec "out of scope" ✓.
- **Type consistency:** action name `archiveNoteFunding` and helper `getNoteFundingArchiveSummary` are used identically across Tasks 2/5; `funding_archived_at` field name is consistent across migration, `AdminNoteDetail`, the participation note sub-select, and the page filter.
- **No un-archive** by design (spec). If needed later it's a one-column reset.
