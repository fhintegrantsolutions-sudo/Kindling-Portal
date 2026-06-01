# Funding Workflow Archive — Design

**Date:** 2026-06-01
**Status:** Approved (pending spec review)

## Problem

The admin funding workflow ([admin/participations/page.tsx](../../../src/app/(protected)/admin/participations/page.tsx)) shows *every* participation, bucketed by funding stage (`awaiting_funding` → `received` → `deposited` → `cleared` → `awaiting_invite`). Once a note is fully funded and live, its participations sit in the `cleared` bucket forever, cluttering the working view. There is currently **no archive or soft-delete anywhere** in the schema.

We want a way to **clear completed notes out of the active funding workflow without deleting any data** — the records must stay queryable.

## Decisions (from brainstorming)

| Question | Decision |
|----------|----------|
| Trigger | **Manual** admin archive (a button) |
| Granularity | **Per note** — archive a note's whole funding round in one action |
| Where archived records remain visible | **Both** an Archived filter on the participations list AND on the note detail page |
| Reversible? | **One-way** (no un-archive in v1) |
| Guard ("only when cleared + active") | **Soft warning** — button stays enabled; a confirm dialog warns if not all participations are cleared or the note isn't Active |

## Approach

Chosen: **a single nullable timestamp column on `notes`** (`funding_archived_at`).

Rejected alternatives:
- **Per-participation `archived_at`**: extra writes, can drift (participations added after archiving wouldn't be flagged); unnecessary given per-note granularity.
- **Dedicated `funding_archives` table**: heaviest; `audit_logs` already exists for a compliance trail. YAGNI.

Rationale: one atomic write per archive, exact fit for per-note granularity, and any participation later attached to an archived note is automatically treated as archived. **`notes.status` is left untouched** — archiving the *funding workflow view* is orthogonal to the note's lifecycle. Lenders keep seeing their active investments and cash flows.

## Schema change

One migration (next in sequence, after `20260515000001_*`):

```sql
alter table public.notes
  add column funding_archived_at timestamptz,
  add column funding_archived_by uuid references auth.users(id);
```

- `funding_archived_at IS NULL` → note's funding is in the active workflow (default).
- `funding_archived_at IS NOT NULL` → archived.

No RLS change needed beyond existing note policies (admins already manage notes). The new columns are admin-write only via the existing note update policy / service path.

## Server action

New admin-only action, e.g. `archiveNoteFunding(noteId)` in `src/lib/admin/note-actions.ts` (alongside existing note status actions):

1. Verify caller is an admin (reuse existing admin guard used by other note actions).
2. Compute eligibility (for the soft warning, surfaced in the UI, not enforced server-side):
   - all participations for the note have `funding_cleared = true`, AND
   - `notes.status = 'Active'`.
3. Set `funding_archived_at = now()`, `funding_archived_by = <admin user id>`.
4. *(Optional)* write an `audit_logs` entry if/when the app adopts an admin-action logging pattern — not currently wired up, so out of scope for v1.
5. `revalidatePath` the participations list and the note detail page.

One-way: no un-archive action in v1. (Trivial to add later — it's just setting the column back to NULL.)

## UI changes

### Workflow list — [admin/participations/page.tsx](../../../src/app/(protected)/admin/participations/page.tsx) + [admin-queries.ts](../../../src/lib/db/admin-queries.ts)

- The participations query (`getParticipations`) joins `notes`; add `funding_archived_at` to the selected note fields.
- **Default view + all existing buckets exclude archived** participations (`note.funding_archived_at == null`). This applies to the stat counts too.
- Add a new **"Archived"** filter value to the existing filter union (currently `awaiting_funding | received | deposited | cleared | awaiting_invite`). When active, show only participations whose note is archived, **grouped by note**.

### Note detail — [admin/notes/[id]/settings/page.tsx](../../../src/app/(protected)/admin/notes/[id]/settings/page.tsx)

- Add an **"Archive funding"** button on the Settings tab (administrative, one-way action belongs here).
- Clicking opens a confirm dialog. If the note is not eligible (some participations not cleared, or note not Active), the dialog shows a **warning** explaining what's incomplete but still allows the admin to proceed (soft guard).
- Once archived: show an **"Funding archived ✓ {date}"** badge on the note detail (Overview and/or Settings) and keep the note's funding records visible there. Hide/disable the archive button after archiving.

## Data flow

```
Admin (Settings tab) → "Archive funding" → confirm dialog (warn if ineligible)
   → archiveNoteFunding(noteId) → notes.funding_archived_at = now()
   → revalidate
        ↳ participations list: note's participations drop out of all active buckets,
          now appear only under the "Archived" filter (grouped by note)
        ↳ note detail: shows "Funding archived ✓" badge, records still visible
```

## Out of scope (v1)

- Un-archive / restore.
- Per-participation archiving.
- Auto-archiving on a trigger.
- `audit_logs` wiring (no existing pattern in app code).

## Testing

- Migration applies cleanly; existing participation/note queries still pass.
- Archiving a note removes its participations from every active bucket and their counts.
- Archived note's participations appear under the "Archived" filter, grouped by note.
- Archive button on Settings warns (but allows) when a participation isn't cleared or note isn't Active.
- Archived note still shows its funding records on the note detail page.
- `notes.status` and lender-facing views are unaffected by archiving.
