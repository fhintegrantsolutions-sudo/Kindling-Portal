# Investor Entities — Phase 3 (Admin + Merge) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins first-class control of investor entities — grant private notes to a specific *entity*, create/edit entities without a script, see people with their entities beneath them, and **merge duplicate logins** into one person with multiple entities.

**Architecture:** Phase 1 put positions on `entity_id`; Phase 2 made the lender portal entity-aware. Phase 3 makes the *admin* side entity-aware and closes the loop that started this project: 8 real people currently hold 2 logins each. Because positions hang off `entity_id`, merging is cheap — re-point `investor_entities.owner_user_id` at the surviving login and the positions travel with their entities.

**Tech Stack:** Next.js 16 (App Router, server actions), Supabase + RLS (`auth_owns_entity`), TypeScript, Base UI, Tailwind. No unit-test framework — verify with `npx tsc --noEmit`, `npx eslint src` (baseline: 8 pre-existing problems, add none), `npx next build`, the kept harnesses in `scripts/verify/`, and manual admin checks. Staging is auto-appliable via `scripts/verify/apply-staging-sql.ts`; **the real DB is applied by hand.**

---

## Scope decisions (read before starting)

**IN scope:** entity visibility picker, admin entity CRUD, person-centric users view, merge tool.

**OUT of scope — deliberately:** dropping the vestigial `user_id` columns from the 5 entity tables. It's a repoint-then-drop cycle exactly like Phase 1's, which is where our worst bugs came from; it delivers zero user-visible value; and the merge tool works fine with those columns present (it just updates them too). Do it as separate cleanup once Phase 3 has settled.

**THE RECURRING BUG CLASS — check every task against it.** Four Phase 1/2 bugs all came from the same two mistakes:
1. **Silently defaulting to the PRIMARY entity** when the right answer was the *selected* entity (or the entity on the row you're acting on). `getPrimaryEntityIdentity()` was deleted for this reason.
2. **Writing an entity-scoped table without `entity_id`** — RLS then rejects the insert, or the row grants/does nothing.

Before finishing ANY task: (a) does every read/write target the right entity, not just the primary? (b) does every insert into `participations` / `note_registrations` / `beneficiaries` / `documents` / `note_visibility` carry `entity_id`?

**Real duplicate logins the merge tool must handle** (found on the real DB — name-match is a HINT, never auto-merge):
felipe vazquez, john lin, jessica saunders, erik westerberg, robin braun, peter teachout, matt bonanno, riley davis — 2 logins each.

---

## File structure

**New**
- `src/lib/admin/entity-actions.ts` — create / update / set-primary for `investor_entities` (admin-guarded).
- `src/app/(protected)/admin/users/[id]/entities-panel.tsx` — entity CRUD UI on the user detail page.
- `src/lib/admin/merge-actions.ts` — `previewMergeLogins`, `mergeLogins`.
- `src/app/(protected)/admin/users/merge/page.tsx` + `merge-form.tsx` — the merge tool.
- `scripts/verify/entity-merge-check.ts` — kept post-merge integrity check.

**Modified**
- `src/lib/db/admin-queries.ts` — `getEntitiesForPicker()`, `getNoteVisibility()` → entity ids, `getUsersWithEntities()`, duplicate-login detection.
- `src/app/(protected)/admin/notes/note-form.tsx` + `src/app/(protected)/admin/notes/[id]/settings/page.tsx` + `src/app/(protected)/admin/notes/new/page.tsx` — visibility picker lists ENTITIES.
- `src/lib/admin/note-actions.ts` — `syncVisibility` writes submitted entity ids directly (no primary-entity mapping).
- `src/app/(protected)/admin/users/page.tsx`, `.../[id]/page.tsx` — person-centric, entities shown.

---

## Task 1: Private-note visibility grants an ENTITY, not a person

**This is the bug you can hit today:** `syncVisibility` maps each selected *user* to their PRIMARY entity, so you cannot invite "Davidshofer Holdings LLC" to a private deal — the grant silently lands on their personal entity instead.

**Files:**
- Modify: `src/lib/db/admin-queries.ts`, `src/lib/admin/note-actions.ts`, `src/app/(protected)/admin/notes/note-form.tsx`, `src/app/(protected)/admin/notes/[id]/settings/page.tsx`, `src/app/(protected)/admin/notes/new/page.tsx`

- [ ] **Step 1: Add an entity picker query**

In `admin-queries.ts`, add alongside the existing `getLendersForPicker()`:

```ts
export type EntityPickerOption = {
  entity_id: string;
  display_name: string;      // entity label, e.g. "Personal" / "Smith LLC"
  owner_user_id: string;
  owner_name: string | null; // the person, so the list is scannable
  owner_email: string | null;
};

// Every investor entity, labelled with the person who owns it. Private-note
// visibility is granted per ENTITY (you invite "Smith LLC", not the human).
export async function getEntitiesForPicker(): Promise<EntityPickerOption[]> {
  const supabase = await createClient();
  const { data: entities } = await supabase
    .from("investor_entities")
    .select("id, display_name, owner_user_id")
    .order("display_name", { ascending: true });
  const rows = (entities ?? []) as Array<{
    id: string;
    display_name: string;
    owner_user_id: string;
  }>;
  if (rows.length === 0) return [];

  const ownerIds = Array.from(new Set(rows.map((r) => r.owner_user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", ownerIds);
  const byId = new Map(
    ((profiles ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }>).map((p) => [
      p.id,
      {
        name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || null,
        email: p.email,
      },
    ]),
  );

  return rows.map((r) => ({
    entity_id: r.id,
    display_name: r.display_name,
    owner_user_id: r.owner_user_id,
    owner_name: byId.get(r.owner_user_id)?.name ?? null,
    owner_email: byId.get(r.owner_user_id)?.email ?? null,
  }));
}
```

- [ ] **Step 2: `getNoteVisibility` returns ENTITY ids**

Find `getNoteVisibility(noteUuid)` in `admin-queries.ts` (it currently returns `user_id`s to pre-tick the picker). Change it to select and return `entity_id`s:

```ts
export async function getNoteVisibility(noteUuid: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("note_visibility")
    .select("entity_id")
    .eq("note_id", noteUuid);
  return ((data ?? []) as Array<{ entity_id: string | null }>)
    .map((r) => r.entity_id)
    .filter(Boolean) as string[];
}
```

- [ ] **Step 3: `syncVisibility` writes the submitted entity ids directly**

In `src/lib/admin/note-actions.ts`, `parseFields` currently reads `visible_user_ids`. Rename to `visible_entity_ids` (`formData.getAll("visible_entity_ids").map(String)`).

Replace the whole primary-entity-mapping block in `syncVisibility` with a direct write. **Validate the submitted ids actually exist** (never trust the form):

```ts
  if (!fields.is_private || fields.visible_entity_ids.length === 0) return;

  // Visibility is granted PER ENTITY — admin picks the entity, so write exactly
  // what was chosen. (Previously this mapped each user to their PRIMARY entity,
  // which made it impossible to invite a non-primary entity to a private note.)
  const { data: valid, error: valErr } = await supabase
    .from("investor_entities")
    .select("id, owner_user_id")
    .in("id", fields.visible_entity_ids);
  if (valErr) throw new Error(`Failed to resolve entities: ${valErr.message}`);

  const found = new Map(
    (valid ?? []).map((e) => [e.id as string, e.owner_user_id as string]),
  );
  const missing = fields.visible_entity_ids.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new Error(`Cannot grant visibility: ${missing.length} unknown entity id(s).`);
  }

  const rows = fields.visible_entity_ids.map((entity_id) => ({
    note_id: noteUuid,
    entity_id,
    // user_id stays denormalized (still dual-written until the cleanup pass).
    user_id: found.get(entity_id)!,
  }));
  const { error: insertErr } = await supabase
    .from("note_visibility")
    .insert(rows);
  if (insertErr) {
    throw new Error(`Failed to set visibility: ${insertErr.message}`);
  }
```

- [ ] **Step 4: The picker lists entities**

In `note-form.tsx`: rename the `lenders: Lender[]` prop to `entities: EntityPickerOption[]` and `visibleUserIds` to `visibleEntityIds`. Each checkbox becomes `name="visible_entity_ids"` `value={e.entity_id}`, labelled with the **entity display_name** as the primary line and **the owner's name + email** as the secondary line (so a person with 2 entities shows 2 clearly-distinguished rows). Keep the existing search box — make it match on entity name, owner name, or owner email. Keep the "Private to specific lenders" copy but adjust it to say entities are invited individually.

Update both callers (`notes/[id]/settings/page.tsx` and `notes/new/page.tsx`) to pass `getEntitiesForPicker()` and `getNoteVisibility()`.

- [ ] **Step 5: Verify**

```
npx tsc --noEmit
npx eslint src           # baseline 8 pre-existing; add none
npx next build
```
Then prove it end-to-end on STAGING with a real signed-in lender. Write a THROWAWAY script (delete after) that: grants the private note to user A's **non-primary** entity only, signs in as A (anon key + JWT), and asserts A can see the note; then grants it to A's primary only and asserts A still sees it. Confirm B never sees it. Report the output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/admin-queries.ts src/lib/admin/note-actions.ts "src/app/(protected)/admin/notes"
git commit -m "feat(entities): grant private-note visibility to an entity, not a person"
```

---

## Task 2: Admin entity CRUD

Today entities can only be created by `scripts/verify/make-test-entity.ts`. Admin needs to do it in the UI.

**Files:**
- Create: `src/lib/admin/entity-actions.ts`, `src/app/(protected)/admin/users/[id]/entities-panel.tsx`
- Modify: `src/app/(protected)/admin/users/[id]/page.tsx`, `src/lib/db/admin-queries.ts`

- [ ] **Step 1: Query a user's entities**

In `admin-queries.ts`:

```ts
export type AdminEntity = {
  id: string;
  display_name: string;
  entity_type: string | null;
  business_name: string | null;
  loan_agreement_title: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  is_primary: boolean;
  positions: number;   // participation count, so admin can't blindly delete
  invested: number;
};

export async function getEntitiesForUser(userId: string): Promise<AdminEntity[]> {
  const supabase = await createClient();
  const { data: ents } = await supabase
    .from("investor_entities")
    .select(
      "id, display_name, entity_type, business_name, loan_agreement_title, address_street, address_city, address_state, address_zip, is_primary",
    )
    .eq("owner_user_id", userId)
    .order("is_primary", { ascending: false })
    .order("display_name", { ascending: true });
  const rows = (ents ?? []) as Omit<AdminEntity, "positions" | "invested">[];
  if (rows.length === 0) return [];

  const { data: parts } = await supabase
    .from("participations")
    .select("entity_id, invested_amount")
    .in("entity_id", rows.map((r) => r.id));

  const agg = new Map<string, { positions: number; invested: number }>();
  for (const p of (parts ?? []) as Array<{ entity_id: string | null; invested_amount: string | null }>) {
    if (!p.entity_id) continue;
    const cur = agg.get(p.entity_id) ?? { positions: 0, invested: 0 };
    cur.positions += 1;
    cur.invested += Number(p.invested_amount ?? 0);
    agg.set(p.entity_id, cur);
  }
  return rows.map((r) => ({
    ...r,
    positions: agg.get(r.id)?.positions ?? 0,
    invested: agg.get(r.id)?.invested ?? 0,
  }));
}
```

- [ ] **Step 2: Entity actions**

Create `src/lib/admin/entity-actions.ts`. All actions call `await requireAdmin()` FIRST (see how `src/lib/admin/note-actions.ts` does it) and use the session client (admin RLS policies already allow full access to `investor_entities`).

- `createEntity(ownerUserId, formData)` — insert with `is_primary: false` (never a second primary; a partial unique index forbids it). Required: `display_name`. Optional: entity_type, business_name, loan_agreement_title, address_*. Revalidate `/admin/users/[id]`.
- `updateEntity(entityId, formData)` — update the same fields. **Never** change `owner_user_id` here (that's the merge tool's job).
- `setPrimaryEntity(entityId)` — must be atomic against the unique index: demote the owner's current primary, then promote this one. Do BOTH in one server action, demote FIRST, and if the promote fails, restore. (There's no transaction across supabase-js calls; do demote→promote and re-check.)
- `deleteEntity(entityId)` — **REFUSE** if the entity has any participations, note_registrations, beneficiaries, documents, or note_visibility rows; report which. Refuse if it's the owner's only entity or is primary. (Mirror `scripts/verify/make-test-entity.ts remove`, which already implements exactly these guards — read it.)

- [ ] **Step 3: Entities panel on the user detail page**

`entities-panel.tsx` (client): lists the user's entities (display_name, type, loan-agreement title, positions + invested, a "Primary" badge). Per row: Edit (inline form or sheet), "Make primary", Delete (disabled with a tooltip/reason when guarded). Plus an "Add entity" form.

Render it from `src/app/(protected)/admin/users/[id]/page.tsx`, fed by `getEntitiesForUser(id)`.

- [ ] **Step 4: Verify**

```
npx tsc --noEmit && npx eslint src && npx next build
```
Manually on staging: create a 2nd entity for a user, rename it, make it primary (confirm the old primary is demoted and the unique index never trips), then try to delete an entity that holds a position — it must REFUSE with a clear reason.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/entity-actions.ts "src/app/(protected)/admin/users/[id]" src/lib/db/admin-queries.ts
git commit -m "feat(entities): admin entity CRUD (create/edit/set-primary/delete with guards)"
```

---

## Task 3: Person-centric admin users view

**Files:** Modify `src/lib/db/admin-queries.ts`, `src/app/(protected)/admin/users/page.tsx`

- [ ] **Step 1: Users list carries entity counts**

Extend the existing users-list query so each row also reports `entity_count` and `position_count` (one extra query for entities grouped by `owner_user_id`, joined in JS — there is NO FK between `profiles` and `investor_entities` (the FK is to `auth.users`), so PostgREST CANNOT embed them; do not try).

- [ ] **Step 2: Show entities under each person**

On `/admin/users`, each row shows the person (name, email, role) plus their entity names as small chips beneath (e.g. `Personal` · `Smith LLC`). If a person has 1 entity, show nothing extra — keep the list clean for the ~174 single-entity lenders.

- [ ] **Step 3: Surface likely duplicates**

Add a "Possible duplicates" section at the top of `/admin/users` listing people whose **first+last name** matches another login (there are currently 8 such pairs). Each entry links to the merge tool (Task 4) pre-filled with those logins.

**This is a HINT, not a judgement** — two different people can share a name. Label it as such, and never auto-merge.

- [ ] **Step 4: Verify + commit**

```
npx tsc --noEmit && npx eslint src && npx next build
git add src/lib/db/admin-queries.ts "src/app/(protected)/admin/users/page.tsx"
git commit -m "feat(entities): person-centric admin users list with duplicate hints"
```

---

## Task 4: The merge tool

Consolidate 2+ logins belonging to the same person into ONE login owning multiple entities. **This is the payoff of the whole project.** It is also the most destructive thing in it — treat it accordingly.

**Files:** Create `src/lib/admin/merge-actions.ts`, `src/app/(protected)/admin/users/merge/page.tsx`, `merge-form.tsx`

### What merging actually does

Because positions hang off `entity_id`, merging is mostly **re-pointing each absorbed entity's `owner_user_id`** to the survivor. Participations, beneficiaries, documents, and visibility travel with their entities automatically.

Five things need care:

1. **Duplicate primaries.** Each login has exactly one `is_primary` entity. After a merge the survivor would have 2+ — the partial unique index `investor_entities_one_primary_idx` **will reject this**. The absorbed logins' primaries MUST be demoted to `is_primary = false` as part of the same operation.
2. **Denormalized `user_id`.** The 5 entity tables still dual-write `user_id`. Update it to the survivor on every row belonging to a moved entity, or those columns go stale and every admin query keyed on `user_id` breaks.
3. **Login-level data.** Referral codes / referrals hang off the login, not the entity. Move (or explicitly drop) them.
4. **Display-name collisions.** Both logins likely have an entity called "Personal". After merging, the survivor has two entities both named "Personal" — useless in the switcher. Rename absorbed ones to disambiguate (e.g. append the absorbed login's email or business name).
5. **The absorbed auth user.** They can no longer sign in. This is real and irreversible-ish — make it deliberate.

- [ ] **Step 1: `previewMergeLogins(survivorId, absorbedIds)`**

In `src/lib/admin/merge-actions.ts`, `requireAdmin()` first. Returns a plain object describing EXACTLY what will change — **it must not write anything**:

```ts
export type MergePreview = {
  survivor: { id: string; name: string | null; email: string | null };
  absorbed: Array<{
    id: string;
    name: string | null;
    email: string | null;
    entities: Array<{
      id: string;
      display_name: string;
      is_primary: boolean;
      positions: number;
      invested: number;
      newDisplayName: string; // after collision-renaming
      willDemote: boolean;    // true if it's currently primary
    }>;
    referralCodes: number;
  }>;
  totals: { entities: number; positions: number; invested: number };
  warnings: string[]; // e.g. "Names differ: 'Riley Davis' vs 'Riley Davies'"
};
```
Include a warning when the survivor and an absorbed login have **different names** — that's the signal they may not be the same person.

- [ ] **Step 2: `mergeLogins(survivorId, absorbedIds, confirmText)`**

`requireAdmin()`. Require `confirmText === "MERGE"` (typed by the admin) or refuse. Then, in order:

1. Re-read the preview (never trust the client's copy).
2. For each absorbed entity: if `is_primary`, set `is_primary = false`. If its `display_name` collides with one the survivor already has, rename it per the preview's `newDisplayName`.
3. Set `owner_user_id = survivorId` on those entities.
4. Update `user_id = survivorId` on `participations`, `note_registrations`, `beneficiaries`, `documents`, `note_visibility` for every row whose `entity_id` is one of the moved entities.
5. Move login-level referral rows to the survivor.
6. Disable each absorbed auth user (service-role `auth.admin.updateUserById(id, { ban_duration: "876000h" })` — i.e. banned, NOT deleted, so nothing cascades and it stays reversible). **Do NOT delete the auth user** — `participations.user_id` is `ON DELETE RESTRICT` and deletion would either fail or destroy data.
7. Log the merge (write an `activities` row, or at minimum `console.info` a structured record with both ids).

Return a summary. Revalidate `/admin/users`.

**Ordering matters:** demote primaries BEFORE re-pointing `owner_user_id`, or the unique index trips mid-merge.

- [ ] **Step 3: The merge UI**

`/admin/users/merge`: pick the survivor and one or more absorbed logins (pre-fillable via query params from Task 3's duplicate hints). Show the **preview** — every entity that moves, its positions and invested total, which primaries get demoted, which get renamed, and any warnings. Require typing **MERGE** to enable the button. Show the result summary afterwards.

- [ ] **Step 4: Prove it on STAGING — do NOT touch the real DB**

Write `scripts/verify/entity-merge-check.ts` (KEPT). It must, against staging:
- Seed a second login for the same person (an extra auth user + profile + a primary entity + a participation on it).
- Call the merge path (or replicate it exactly).
- Assert afterwards: the survivor owns ALL entities; exactly ONE is primary; no display-name duplicates; every moved row's `user_id` is the survivor; the absorbed login owns zero entities and is banned; **position count and invested total are unchanged** (nothing lost).
- Then run `entity-reconciliation.ts` and `entity-rls-isolation.ts` → both must PASS.
- Finally, sign in as the SURVIVOR (anon key + JWT) and assert they can see the positions that came from the absorbed login. **This is the whole point — if the merged-in positions aren't visible to the survivor, the merge failed.**

Run it. Paste the output.

- [ ] **Step 5: Verify + commit**

```
npx tsc --noEmit && npx eslint src && npx next build
VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-merge-check.ts
VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-reconciliation.ts
VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-rls-isolation.ts
git add src/lib/admin/merge-actions.ts "src/app/(protected)/admin/users/merge" scripts/verify/entity-merge-check.ts
git commit -m "feat(entities): admin merge tool (consolidate duplicate logins)"
```

---

## Task 5: Land, then merge the real duplicates (human-gated)

- [ ] **Step 1: Full verification**

```
npx tsc --noEmit && npx eslint src && npx next build
VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-reconciliation.ts
VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-rls-isolation.ts
VERIFY_ENV=.env.local  npx tsx scripts/verify/entity-reconciliation.ts
```
All PASS.

- [ ] **Step 2: Merge the branch**

```bash
git checkout main
git merge --no-ff feat/investor-entities-phase3 -m "Merge investor-entities Phase 3: admin entity management + merge tool"
git push
git branch -d feat/investor-entities-phase3
```

- [ ] **Step 3: HUMAN — merge the real duplicates one at a time**

**No migration and no script does this.** The admin (Haley) runs the merge tool in the UI, per person, reviewing each preview. Candidates (name-match only — CONFIRM each is really the same person before merging):

| Person | Logins |
|---|---|
| Felipe Vazquez | shoboshi112@gmail.com · fandfsnowball@yahoo.com |
| John Lin | cornerstonelegacywealth@gmail.com · cornerstonesandfootprintsllc@gmail.com |
| Jessica Saunders | creativityontap2023@gmail.com · jrslegacyproject@gmail.com |
| Erik Westerberg | ewesterberg@pcimmg.com · ewesterberg01@gmail.com |
| Robin Braun | integratedlifestrategies@gmail.com · robin@drrobinbraun.com |
| Peter Teachout | mountainstreams51@gmail.com · buildingadifference@gmail.com |
| Matt Bonanno | mbonanno@hrg-inc.com · maverixk@hotmail.com |
| Riley Davis | onemorrisoncastle@gmail.com · rileyr8080@gmail.com |

Note: "Specialized Trust Company Custodian FBO Felipe Vazquez ROTH IRA" (fandfsdira@yahoo.com) is likely a THIRD Felipe login — check it.

After each merge, run `VERIFY_ENV=.env.local npx tsx scripts/verify/entity-reconciliation.ts` → must PASS.

Tell the person which email survives — **the other can no longer sign in.**

---

## End state

Admin can invite a specific entity to a private note, create/edit/delete entities without a script, see people with their entities beneath them, and merge duplicate logins so one person logs in once and switches between their personal and business positions. The 8 duplicate people can finally be consolidated.

## Deferred (not Phase 3)
- Drop the vestigial `user_id` columns from the 5 entity tables (repoint-then-drop cycle; do it as isolated cleanup).
- Un-merge / merge history UI. Merges are logged and the absorbed login is banned rather than deleted, so a merge is recoverable by hand — but there's no button for it.
