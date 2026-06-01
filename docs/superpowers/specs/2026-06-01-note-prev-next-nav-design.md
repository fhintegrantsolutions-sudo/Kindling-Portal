# Admin Note Prev/Next Navigation — Design

**Date:** 2026-06-01
**Status:** Approved

## Problem

On the admin note detail page, moving between notes means clicking "← Back to notes" and scrolling the list each time. Add Prev/Next controls in the note header so an admin can step through notes directly.

## Decisions (from brainstorming)

| Question | Decision |
|----------|----------|
| Control style | Labeled with the adjacent note's ID, e.g. `‹ K25002` / `K23005 ›` |
| End behavior | Disabled/greyed at the ends (no wrap) |
| Order | By `note_id` ascending left-to-right: `‹` goes to the next-lower note_id, `›` to the next-higher |
| On navigate | Land on the target note's **Overview** tab (v1; tab preservation out of scope) |
| Placement | Note header in `[id]/layout.tsx`, right-aligned — shows on all four tabs |

## Approach

Two targeted neighbor queries (no loading the whole list), keyed on `note_id`. Controls read left-to-right by number:

- **Prev** (`‹`, left) = next-LOWER note_id: largest `note_id` less than current.
- **Next** (`›`, right) = next-HIGHER note_id: smallest `note_id` greater than current.

Each returns `{ id, note_id }` or `null` (→ render disabled).

## Components

**Query** — new `getAdminNoteNeighbors(currentNoteId: string)` in `src/lib/db/admin-queries.ts`:

```ts
export async function getAdminNoteNeighbors(currentNoteId: string): Promise<{
  prev: { id: string; note_id: string } | null;
  next: { id: string; note_id: string } | null;
}>
```
- prev: `.from("notes").select("id, note_id").gt("note_id", currentNoteId).order("note_id", { ascending: true }).limit(1).maybeSingle()`
- next: `.from("notes").select("id, note_id").lt("note_id", currentNoteId).order("note_id", { ascending: false }).limit(1).maybeSingle()`
- Run both with `Promise.all`.

**Presentational component** — `src/app/(protected)/admin/notes/[id]/note-sibling-nav.tsx` (`NoteSiblingNav({ prev, next })`), no `"use client"` (just `Link`s + lucide `ChevronLeft`/`ChevronRight`). Renders a labeled `Link` per side, or a greyed disabled `span` when the neighbor is `null`.

**Wiring** — `[id]/layout.tsx`: after fetching `note`, also fetch `getAdminNoteNeighbors(note.note_id)`; wrap the existing `<header>` and `<NoteSiblingNav>` in a `flex items-start justify-between` row so the controls sit top-right.

## Data flow

```
layout (server) → getAdminNoteById(id) → note
                → getAdminNoteNeighbors(note.note_id) → { prev, next }
   render: [ header (note_id + title) ............ NoteSiblingNav(prev,next) ]
   click ‹ prev.note_id  → /admin/notes/{prev.id}   (Overview)
   click   next.note_id › → /admin/notes/{next.id}  (Overview)
```

## Edge cases
- Lowest note_id: `prev = null` → left (`‹`) control disabled.
- Highest note_id: `next = null` → right (`›`) control disabled.
- `note_id` format is fixed-width (`K` + digits, e.g. `K24001`), so string comparison matches numeric order and matches the list's own `note_id` ordering exactly.

## Out of scope (v1)
- Preserving the active tab on navigate (lands on Overview).
- Following the list's transient sort toggle / search filter (uses the canonical descending `note_id` order).
- Keyboard shortcuts.

## Testing
- Typecheck + lint clean.
- Runtime check against real data: neighbors of a mid-list note resolve to the adjacent note_ids; first/last notes return `null` on the appropriate side.
- Manual: arrows appear on all four tabs; disabled at the ends; clicking moves to the adjacent note.
