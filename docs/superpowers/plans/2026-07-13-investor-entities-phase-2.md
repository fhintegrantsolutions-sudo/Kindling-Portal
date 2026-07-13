# Investor Entities — Phase 2 (Entity-aware portal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the lender portal multi-entity: an entity switcher with an "All entities" rollup, per-entity beneficiaries/tax/loan-agreement tabs, an entity picker at registration, and paperwork that carries the *position's* entity name.

**Architecture:** Phase 1 already made every lender read entity-scoped — `getMy*` filter on `.in("entity_id", ctx.entityIds)` via `getCurrentEntityContext()`, which reads a `current_entity` cookie and validates ownership. So **switching entities is mostly a matter of setting that cookie**: the existing reads then filter automatically, and "All" is just a longer `entityIds` list. Phase 2 adds the UI to set it, the per-entity tab surfaces, the write-side entity picker, and fixes the places that still assume a single (primary) entity.

**Tech Stack:** Next.js 16 (App Router, server actions, `cookies()`), Supabase + RLS (`auth_owns_entity`), TypeScript, Base UI, Tailwind. No unit-test framework — verification is `npx tsc --noEmit`, `npx eslint src`, the kept harnesses in `scripts/verify/`, and manual UI checks. Staging DB is auto-appliable via `scripts/verify/apply-staging-sql.ts`; the real DB is applied by hand.

**Phase 1 invariant is now GONE.** Phase 1 could assume "exactly one entity per login". Phase 2 must handle N. Anywhere that assumed one entity (`getPrimaryEntityIdentity`, `.maybeSingle()` on entity-scoped reads) is a bug to fix, not a pattern to copy.

**No DB migration is required for Phase 2** — the schema already supports N entities per login. The only DB work is *creating* a second entity (Task 1), and admin entity CRUD is deliberately deferred to Phase 3.

---

## File structure

**New files**
- `scripts/verify/make-test-entity.ts` — provision/remove a 2nd entity for a login so multi-entity can actually be exercised (admin CRUD is Phase 3).
- `src/lib/entities/actions.ts` — `setCurrentEntity(entityId | "all")` server action (writes the cookie, validates ownership).
- `src/components/entity-switcher.tsx` — client switcher rendered in the sidebar.
- `src/lib/entities/copy-beneficiaries.ts` — `copyBeneficiariesFromEntity` server action.

**Modified**
- `src/lib/entities/context.ts` — add `getCurrentEntityIdentity()` (CURRENT entity, replacing primary-only assumptions).
- `src/app/(protected)/layout.tsx` + `src/components/app-sidebar.tsx` — render the switcher.
- `src/lib/db/queries.ts` — fix `.maybeSingle()` in "all" mode; add per-participation entity to note reads.
- `src/app/(protected)/profile/tax-forms/page.tsx`, `.../loan-agreement/page.tsx` — current entity, not primary.
- `src/app/(protected)/profile/beneficiaries/page.tsx` — show the entity + "copy from another entity".
- `src/app/(protected)/opportunities/[id]/page.tsx` + `registration-form.tsx` + `src/lib/registration/actions.ts` — entity picker.
- `src/app/(protected)/notes/[id]/page.tsx` — paperwork name from the participation's entity.
- `src/app/(protected)/dashboard/page.tsx` — per-entity breakdown in "All" mode.
- `scripts/verify/entity-rls-isolation.ts` — extend for a genuinely multi-entity user.

---

## Task 1: Test-entity provisioning script

Without a 2nd entity, nothing in Phase 2 can be exercised. Admin entity CRUD is Phase 3, so this is a script.

**Files:** Create `scripts/verify/make-test-entity.ts`

- [ ] **Step 1: Write the script**

```ts
/**
 * Provision (or remove) an extra investor entity for a login, so multi-entity
 * behavior can be exercised before admin entity CRUD lands in Phase 3.
 *
 *   npx tsx scripts/verify/make-test-entity.ts add <email> "<display name>" [entity_type] [business_name]
 *   npx tsx scripts/verify/make-test-entity.ts list <email>
 *   npx tsx scripts/verify/make-test-entity.ts remove <entity_id>
 *
 * Defaults to .env.staging; set VERIFY_ENV=.env.local to target the real DB.
 * Refuses to remove an entity that still holds participations.
 */
import { config } from "dotenv";
config({ path: process.env.VERIFY_ENV ?? ".env.staging" });
import { createClient } from "@supabase/supabase-js";

const url =
  process.env.STAGING_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key =
  process.env.STAGING_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function userIdForEmail(email: string): Promise<string> {
  const { data, error } = await db
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`No profile with email ${email}`);
  return data.id as string;
}

async function main() {
  console.log(`database: ${url}`);
  const [cmd, a, b, c, d] = process.argv.slice(2);

  if (cmd === "list") {
    const uid = await userIdForEmail(a);
    const { data } = await db
      .from("investor_entities")
      .select("id, display_name, entity_type, is_primary")
      .eq("owner_user_id", uid)
      .order("is_primary", { ascending: false });
    console.table(data ?? []);
    return;
  }

  if (cmd === "add") {
    const uid = await userIdForEmail(a);
    const { data, error } = await db
      .from("investor_entities")
      .insert({
        owner_user_id: uid,
        display_name: b,
        entity_type: c ?? "LLC",
        business_name: d ?? b,
        loan_agreement_title: d ?? b,
        is_primary: false, // never a 2nd primary — a unique index forbids it
      })
      .select("id, display_name, is_primary")
      .single();
    if (error) throw new Error(error.message);
    console.log("created:", data);
    return;
  }

  if (cmd === "remove") {
    const { count } = await db
      .from("participations")
      .select("*", { count: "exact", head: true })
      .eq("entity_id", a);
    if ((count ?? 0) > 0) {
      throw new Error(`Refusing: entity ${a} holds ${count} participation(s).`);
    }
    const { error } = await db.from("investor_entities").delete().eq("id", a);
    if (error) throw new Error(error.message);
    console.log(`removed entity ${a}`);
    return;
  }

  console.log("usage: add <email> <display_name> [entity_type] [business_name] | list <email> | remove <entity_id>");
  process.exit(1);
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
```

- [ ] **Step 2: Give the staging seed user a 2nd entity**

Run:
```
npx tsx scripts/verify/make-test-entity.ts add rls-a@example.com "Alpha Holdings LLC" LLC "Alpha Holdings LLC"
npx tsx scripts/verify/make-test-entity.ts list rls-a@example.com
```
Expected: two rows for user A — `Personal` (is_primary true) and `Alpha Holdings LLC` (is_primary false).

- [ ] **Step 3: Confirm RLS still isolates**

Run: `VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-rls-isolation.ts`
Expected: `RLS ISOLATION PASS` — A now owns 2 entities and must see BOTH; B must still see none of them.
(If the harness hardcodes "A has exactly 1 entity", it will fail here. That's correct — fix the harness in Task 10, not now. If it fails ONLY on that count assertion, note it and continue.)

- [ ] **Step 4: Commit**

```bash
git add scripts/verify/make-test-entity.ts
git commit -m "test(entities): script to provision an extra entity for multi-entity testing"
```

---

## Task 2: `setCurrentEntity` server action

**Files:** Create `src/lib/entities/actions.ts`

- [ ] **Step 1: Write the action**

```ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ALL_ENTITIES, CURRENT_ENTITY_COOKIE } from "@/lib/entities/context";

// Set the lender's current entity context. Accepts a concrete entity id or the
// literal "all". Validates OWNERSHIP server-side — a caller can never select an
// entity they don't own (RLS is the backstop, but we reject early and loudly).
export async function setCurrentEntity(value: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  if (value !== ALL_ENTITIES) {
    const { data } = await supabase
      .from("investor_entities")
      .select("id")
      .eq("id", value)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (!data) throw new Error("Unknown entity");
  }

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_ENTITY_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Every lender surface is entity-scoped, so bust them all.
  revalidatePath("/", "layout");
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/entities/actions.ts
git commit -m "feat(entities): setCurrentEntity server action (ownership-validated)"
```

---

## Task 3: Entity switcher in the sidebar

**Files:**
- Create: `src/components/entity-switcher.tsx`
- Modify: `src/app/(protected)/layout.tsx`, `src/components/app-sidebar.tsx`

**Critical:** render the switcher ONLY when the login owns 2+ entities. A single-entity lender must see **no new UI** (no regression for the 150+ existing lenders).

- [ ] **Step 1: Create the switcher component**

```tsx
"use client";

import { useTransition } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { setCurrentEntity } from "@/lib/entities/actions";

export type SwitcherEntity = { id: string; display_name: string };

export function EntitySwitcher({
  entities,
  currentEntityId,
  mode,
}: {
  entities: SwitcherEntity[];
  currentEntityId: string | null;
  mode: "all" | "one";
}) {
  const [pending, startTransition] = useTransition();

  // Single-entity lenders get no switcher at all.
  if (entities.length < 2) return null;

  const label =
    mode === "all"
      ? "All entities"
      : (entities.find((e) => e.id === currentEntityId)?.display_name ??
        "Select entity");

  const choose = (value: string) => {
    startTransition(async () => {
      await setCurrentEntity(value);
    });
  };

  return (
    <div className="px-6 pb-2">
      <Menu.Root>
        <Menu.Trigger
          disabled={pending}
          className="flex w-full items-center justify-between gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent disabled:opacity-60"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="size-4 shrink-0" />
            <span className="truncate">{pending ? "Switching…" : label}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={4} className="z-50">
            <Menu.Popup className="min-w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
              {entities.map((e) => (
                <Menu.Item
                  key={e.id}
                  onClick={() => choose(e.id)}
                  className={`cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent ${
                    mode === "one" && e.id === currentEntityId
                      ? "font-medium"
                      : ""
                  }`}
                >
                  {e.display_name}
                </Menu.Item>
              ))}
              <div className="my-1 border-t" />
              <Menu.Item
                onClick={() => choose("all")}
                className={`cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent ${
                  mode === "all" ? "font-medium" : ""
                }`}
              >
                All entities
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
```

**Note:** verify the Base UI Menu subcomponent names against the installed version (`@base-ui/react/menu`) — this repo's `src/components/ui/sheet.tsx` shows the Dialog pattern (`Root`/`Portal`/`Backdrop`/`Popup`). If `Menu` has a different shape, adapt; if it's awkward, fall back to a plain `<select>` styled to match, wrapped in a form that calls `setCurrentEntity`. Functionality beats fidelity here.

- [ ] **Step 2: Pass entity context into the sidebar**

In `src/app/(protected)/layout.tsx`, resolve the context and pass it down:

```tsx
import { getCurrentEntityContext } from "@/lib/entities/context";
// ...
const ctx = await getCurrentEntityContext();
// ...
<AppSidebar
  email={session.email}
  firstName={(profile?.first_name as string | null) ?? null}
  lastName={(profile?.last_name as string | null) ?? null}
  role={profile?.role ?? null}
  entities={ctx?.entities.map((e) => ({ id: e.id, display_name: e.display_name })) ?? []}
  currentEntityId={ctx?.currentEntityId ?? null}
  entityMode={ctx?.mode ?? "one"}
/>
```

In `src/components/app-sidebar.tsx`, accept those three new props and render `<EntitySwitcher entities={entities} currentEntityId={currentEntityId} mode={entityMode} />` directly beneath the logo block (above the first `<Separator />`).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npx eslint src/components/entity-switcher.tsx src/components/app-sidebar.tsx "src/app/(protected)/layout.tsx"`
Expected: clean (note: `npx eslint src` has ~8 PRE-EXISTING problems unrelated to this work — confirm you add none).

- [ ] **Step 4: Commit**

```bash
git add src/components/entity-switcher.tsx src/components/app-sidebar.tsx "src/app/(protected)/layout.tsx"
git commit -m "feat(entities): entity switcher in sidebar (hidden for single-entity logins)"
```

---

## Task 4: Fix single-row reads for "all" mode

**Files:** Modify `src/lib/db/queries.ts`

`getMyParticipationByNoteId` and `getBeneficiaryById` use `.maybeSingle()`. In "all" mode a lender can hold the **same note through two entities** — `.maybeSingle()` then THROWS. This is a real crash, not a theoretical one.

- [ ] **Step 1: Fix `getMyParticipationByNoteId`**

Replace its `.maybeSingle()` with an ordered `.limit(1)` list read, returning the first row (deterministic: prefer the current entity, else oldest):

```ts
  const { data } = await supabase
    .from("participations")
    .select(/* keep the existing select exactly */)
    .eq("note_id", noteUuid)
    .in("entity_id", ctx.entityIds)
    .order("created_at", { ascending: true })
    .limit(1);

  return ((data ?? [])[0] ?? null) as unknown as MyParticipation | null;
```

- [ ] **Step 2: Fix `getBeneficiaryById`**

It reads one row BY ID, so multiplicity isn't the issue — but keep `.maybeSingle()` and simply ensure the `.in("entity_id", ctx.entityIds)` filter remains (a beneficiary id is unique, so at most one row can match). Add a comment explaining why `.maybeSingle()` is safe here but not in the participation read.

- [ ] **Step 3: Verify no other entity-scoped read uses maybeSingle unsafely**

Run: `grep -n "maybeSingle\|\.single()" src/lib/db/queries.ts`
For each hit, confirm it's either keyed by a unique id, or not entity-scoped. Report the list and your reasoning.

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/db/queries.ts
git commit -m "fix(entities): don't assume one row per note across entities in all-mode"
```

---

## Task 5: Tax-forms + loan-agreement tabs follow the CURRENT entity

**Files:**
- Modify: `src/lib/entities/context.ts` (add `getCurrentEntityIdentity`)
- Modify: `src/app/(protected)/profile/loan-agreement/page.tsx`, `src/app/(protected)/profile/tax-forms/page.tsx`

Today these use `getPrimaryEntityIdentity()` — they'd always show the *primary* entity even when the lender has switched to their LLC. Wrong.

- [ ] **Step 1: Add `getCurrentEntityIdentity` to `src/lib/entities/context.ts`**

```ts
// Identity of the CURRENTLY SELECTED entity. In "all" mode there is no single
// identity (paperwork is per-entity), so this returns null and callers must
// tell the user to pick an entity.
export async function getCurrentEntityIdentity(): Promise<
  (EntityIdentity & { id: string; display_name: string }) | null
> {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.mode === "all" || !ctx.currentEntityId) return null;

  const { data } = await supabase
    .from("investor_entities")
    .select(
      "id, display_name, entity_type, business_name, loan_agreement_title, address_street, address_city, address_state, address_zip",
    )
    .eq("id", ctx.currentEntityId)
    .maybeSingle();

  return (data ?? null) as
    | (EntityIdentity & { id: string; display_name: string })
    | null;
}
```

- [ ] **Step 2: Loan-agreement page uses it**

In `src/app/(protected)/profile/loan-agreement/page.tsx`, swap `getPrimaryEntityIdentity()` for `getCurrentEntityIdentity()`. When it returns `null` (i.e. "All entities" is selected), render instead:

```tsx
<p className="text-sm text-muted-foreground">
  Loan agreement details are specific to one entity. Choose an entity from the
  switcher to see its details.
</p>
```
And when non-null, show the entity's `display_name` as a heading above the fields so it's unambiguous WHICH entity's paperwork is shown.

- [ ] **Step 3: Tax-forms page shows which entity the W-9 is for**

In `src/app/(protected)/profile/tax-forms/page.tsx` (currently static), call `getCurrentEntityIdentity()`. When non-null, title the card `W-9 — {display_name}` and keep the existing "Update W-9" link. When null ("All entities"), show the same "choose an entity" message as above (each entity files its own W-9, so an "all" W-9 is meaningless).

- [ ] **Step 4: Verify + commit**

```bash
npx tsc --noEmit && npx eslint src/lib/entities/context.ts "src/app/(protected)/profile/loan-agreement/page.tsx" "src/app/(protected)/profile/tax-forms/page.tsx"
git add src/lib/entities/context.ts "src/app/(protected)/profile/loan-agreement/page.tsx" "src/app/(protected)/profile/tax-forms/page.tsx"
git commit -m "feat(entities): tax-forms + loan-agreement follow the selected entity"
```

---

## Task 6: Per-entity beneficiaries + "copy from another entity"

**Files:**
- Create: `src/lib/entities/copy-beneficiaries.ts`
- Modify: `src/app/(protected)/profile/beneficiaries/page.tsx`

Beneficiaries are already per-entity (Phase 1 + the entity_id hotfix). What's missing: the page doesn't say WHICH entity's list you're looking at, and there's no copy shortcut (the user explicitly asked for one).

- [ ] **Step 1: Write the copy action**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentEntityContext } from "@/lib/entities/context";

// Copy every beneficiary from one owned entity to another owned entity.
// Ownership of BOTH is validated. Refuses if the target already has any
// beneficiaries (so this can never silently double-allocate past 100%).
export async function copyBeneficiariesFromEntity(
  sourceEntityId: string,
): Promise<{ error?: string; message?: string }> {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.mode === "all" || !ctx.currentEntityId) {
    return { error: "Pick a single entity to copy beneficiaries into." };
  }
  const target = ctx.currentEntityId;
  if (sourceEntityId === target) return { error: "Source and target are the same entity." };
  if (!ctx.entityIds.includes(sourceEntityId) && !ctx.entities.some((e) => e.id === sourceEntityId)) {
    return { error: "Unknown source entity." };
  }

  const { count } = await supabase
    .from("beneficiaries")
    .select("*", { count: "exact", head: true })
    .eq("entity_id", target);
  if ((count ?? 0) > 0) {
    return {
      error:
        "This entity already has beneficiaries. Remove them first if you want to copy a different set.",
    };
  }

  const { data: source, error: readErr } = await supabase
    .from("beneficiaries")
    .select("user_id, name, relation, percentage, type, dob, phone, address, ssn_last4")
    .eq("entity_id", sourceEntityId);
  if (readErr) return { error: readErr.message };
  if (!source || source.length === 0) {
    return { error: "That entity has no beneficiaries to copy." };
  }

  const rows = source.map((b) => ({ ...b, entity_id: target }));
  const { error: insErr } = await supabase.from("beneficiaries").insert(rows);
  if (insErr) return { error: insErr.message };

  revalidatePath("/profile/beneficiaries");
  return { message: `Copied ${rows.length} beneficiary(ies).` };
}
```

- [ ] **Step 2: Surface the entity + copy control on the beneficiaries page**

In `src/app/(protected)/profile/beneficiaries/page.tsx`:
- Call `getCurrentEntityContext()`. If `mode === "all"`, render a short message ("Beneficiaries are set per entity. Choose an entity from the switcher.") and nothing else — an "all" beneficiary list would be meaningless because the 100% rule is per-entity.
- Otherwise, show the current entity's `display_name` in the intro line, e.g. "People who inherit **{display_name}**'s participation…".
- When the login owns 2+ entities AND the current entity has **zero** beneficiaries, render a small "Copy from another entity" control listing the *other* entities; picking one calls `copyBeneficiariesFromEntity`.

- [ ] **Step 3: Verify + commit**

```bash
npx tsc --noEmit && npx eslint src/lib/entities/copy-beneficiaries.ts "src/app/(protected)/profile/beneficiaries/page.tsx"
git add src/lib/entities/copy-beneficiaries.ts "src/app/(protected)/profile/beneficiaries/page.tsx"
git commit -m "feat(entities): per-entity beneficiaries with copy-from-another-entity"
```

---

## Task 7: Entity picker at registration

**Files:** Modify `src/app/(protected)/opportunities/[id]/page.tsx`, `.../registration-form.tsx`, `src/lib/registration/actions.ts`

Registration currently uses `getWriteEntityId()` (current, else primary). With multiple entities the lender must CHOOSE which one is investing — and in "All" mode there's no defensible default.

- [ ] **Step 1: Pass the entity list into the form**

In `src/app/(protected)/opportunities/[id]/page.tsx`, call `getCurrentEntityContext()` and pass `entities` + `currentEntityId` into `<RegistrationForm>`.

- [ ] **Step 2: Add the selector to the form**

In `registration-form.tsx`, when `entities.length > 1`, render a required `<select name="entity_id">` labelled **"Which entity is investing?"**, defaulting to `currentEntityId` when set. When `entities.length === 1`, render a hidden input with that single id (no UI change for existing lenders). Show `fieldErrors.entity_id` beneath it.

Also surface the chosen entity's loan-agreement title in the existing read-only summary so the lender sees exactly what will appear on the paperwork.

- [ ] **Step 3: Action reads the submitted entity and validates ownership**

In `src/lib/registration/actions.ts` `submitRegistration`:

```ts
const submittedEntityId = String(formData.get("entity_id") ?? "").trim();
const ctx = await getCurrentEntityContext();
if (!ctx || ctx.entities.length === 0) {
  return { error: "No investor entity is set up for your account. Contact info@kindling.network." };
}
// Must be one the caller actually owns. Never trust the form.
const owned = ctx.entities.some((e) => e.id === submittedEntityId);
const entityId = owned ? submittedEntityId : null;
if (!entityId) {
  return { fieldErrors: { entity_id: "Choose which entity is investing." } };
}
```
Then read the entity snapshot (`entity_type`, `loan_agreement_title`, address) **by that `entityId`** (it already does this — keep it) and set `entity_id: entityId` on both inserts. Remove the `getWriteEntityId()` fallback from this action so an entity is always an explicit choice.

- [ ] **Step 4: Verify + commit**

```bash
npx tsc --noEmit && npx eslint src/lib/registration/actions.ts "src/app/(protected)/opportunities/[id]/page.tsx" "src/app/(protected)/opportunities/[id]/registration-form.tsx"
git add src/lib/registration/actions.ts "src/app/(protected)/opportunities/[id]"
git commit -m "feat(entities): choose the investing entity at registration"
```

---

## Task 8: Paperwork carries the position's entity

**Files:** Modify `src/lib/db/queries.ts`, `src/app/(protected)/notes/[id]/page.tsx`

`notes/[id]` builds the schedule-PDF lender name from `getPrimaryEntityIdentity()`. That's wrong the moment a position is held by a non-primary entity — the PDF would carry the wrong legal name.

- [ ] **Step 1: Return the entity with the participation**

In `getMyParticipationByNoteId` (queries.ts), extend the select to embed the entity and add it to the returned type:

```ts
.select(`
  id, invested_amount, status, user_notes,
  funding_received, funding_deposited, funding_cleared, funding_type,
  entity:investor_entities ( id, display_name, loan_agreement_title )
`)
```
Add to `MyParticipation`:
```ts
entity: { id: string; display_name: string; loan_agreement_title: string | null } | null;
```
(Keep every existing field — do not drop any.)

- [ ] **Step 2: Use it for the paperwork name**

In `src/app/(protected)/notes/[id]/page.tsx`, replace the `getPrimaryEntityIdentity()` call. The lender name becomes:

```ts
const lenderName =
  (participation.entity?.loan_agreement_title ?? "").trim() ||
  [profile?.first_name ?? "", profile?.last_name ?? ""].filter(Boolean).join(" ") ||
  profile?.email ||
  "Lender";
```
Also show the holding entity's `display_name` on the "Your participation" card (a small "Held by {display_name}" line) — but ONLY when the login owns 2+ entities, so single-entity lenders see no change.

- [ ] **Step 3: Verify + commit**

```bash
npx tsc --noEmit && npx eslint src/lib/db/queries.ts "src/app/(protected)/notes/[id]/page.tsx"
git add src/lib/db/queries.ts "src/app/(protected)/notes/[id]/page.tsx"
git commit -m "feat(entities): paperwork name comes from the position's entity"
```

---

## Task 9: Dashboard "All entities" breakdown

**Files:** Modify `src/app/(protected)/dashboard/page.tsx`, `src/lib/db/queries.ts`

The dashboard already sums correctly across `ctx.entityIds` (so "All" totals are right today). What's missing is the **breakdown** — in "All" mode the lender should see which entity holds what.

- [ ] **Step 1: Add a per-entity totals read**

In `queries.ts`:

```ts
export type EntityTotal = {
  entity_id: string;
  display_name: string;
  invested: number;
  positions: number;
};

// Invested total + position count per entity, for the dashboard's "All entities"
// breakdown. Only counts Active + funding-cleared rows, matching the dashboard's
// definition of deployed capital.
export async function getMyTotalsByEntity(): Promise<EntityTotal[]> {
  const supabase = await createClient();
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entityIds.length === 0) return [];

  const { data } = await supabase
    .from("participations")
    .select("invested_amount, entity_id, status, funding_cleared")
    .in("entity_id", ctx.entityIds)
    .eq("status", "Active")
    .eq("funding_cleared", true);

  const byId = new Map<string, { invested: number; positions: number }>();
  for (const r of (data ?? []) as Array<{
    invested_amount: string;
    entity_id: string | null;
  }>) {
    if (!r.entity_id) continue;
    const cur = byId.get(r.entity_id) ?? { invested: 0, positions: 0 };
    cur.invested += Number(r.invested_amount ?? 0);
    cur.positions += 1;
    byId.set(r.entity_id, cur);
  }

  return ctx.entities
    .filter((e) => byId.has(e.id))
    .map((e) => ({
      entity_id: e.id,
      display_name: e.display_name,
      invested: byId.get(e.id)!.invested,
      positions: byId.get(e.id)!.positions,
    }))
    .sort((a, b) => b.invested - a.invested);
}
```

- [ ] **Step 2: Render the breakdown**

In `dashboard/page.tsx`, also call `getCurrentEntityContext()` and `getMyTotalsByEntity()`. When `ctx.mode === "all"` AND `ctx.entities.length > 1`, render a small card beneath the stat tiles: one row per entity showing `display_name`, `formatCurrency(invested)`, and `{positions} position(s)`. Otherwise render nothing new (single-entity lenders see zero change).

- [ ] **Step 3: Verify + commit**

```bash
npx tsc --noEmit && npx eslint src/lib/db/queries.ts "src/app/(protected)/dashboard/page.tsx"
git add src/lib/db/queries.ts "src/app/(protected)/dashboard/page.tsx"
git commit -m "feat(entities): per-entity breakdown on the dashboard in all-mode"
```

---

## Task 10: Extend the RLS harness for multi-entity, then verify everything

**Files:** Modify `scripts/verify/entity-rls-isolation.ts`

The harness currently asserts A owns a fixed number of entities. Now A owns 2 (Task 1). The security property to prove is the one that matters for Phase 2: **a lender sees ALL of their own entities' rows, and NONE of anyone else's.**

- [ ] **Step 1: Make the harness multi-entity aware**

- Resolve A's entities at runtime (do not hardcode a count).
- Assert A sees **every** entity they own (compare against the service-role list).
- Seed a participation on A's SECOND entity (via the service-role client), then assert A — in "all" mode — sees positions from **both** entities, and that each row's `entity_id` is one A owns.
- Keep every existing negative assertion (A sees none of B's; A cannot insert on B's entity; B can't see A's private note) and the positive control insert.
- Clean up anything the harness creates.

- [ ] **Step 2: Run it**

Run: `VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-rls-isolation.ts`
Expected: `RLS ISOLATION PASS`, exit 0.

- [ ] **Step 3: Prove it still has teeth**

Weaken a policy on staging, confirm FAIL, restore:
```
npx tsx scripts/verify/apply-staging-sql.ts --sql "drop policy \"participations read own\" on public.participations; create policy \"participations read own\" on public.participations for select using (true);"
VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-rls-isolation.ts   # MUST FAIL
npx tsx scripts/verify/apply-staging-sql.ts supabase/migrations/20260712000002_investor_entities_rls.sql
VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-rls-isolation.ts   # PASS again
```
Paste the FAIL output.

- [ ] **Step 4: Full-suite verification**

```
npx tsc --noEmit
npx eslint src          # must add NO new problems over the ~8 pre-existing
VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-reconciliation.ts   # RECONCILIATION PASS
npx next build
```
Note: reconciliation asserts `entities == profiles`. With a 2nd test entity on staging that assertion is now WRONG (2 entities for 1 profile is *legal* in Phase 2). **Update the reconciliation script**: replace "exactly one entity per profile" with "every profile has ≥1 entity AND exactly one primary". Keep every orphan/ownership check unchanged. Re-run → PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify/entity-rls-isolation.ts scripts/verify/entity-reconciliation.ts
git commit -m "test(entities): harnesses handle multi-entity logins"
```

---

## Task 11: Manual verification + land

- [ ] **Step 1: Give a real test login a 2nd entity**

```
VERIFY_ENV=.env.local npx tsx scripts/verify/make-test-entity.ts add hdavidsh@gmail.com "Davidshofer Holdings LLC" LLC "Davidshofer Holdings LLC"
VERIFY_ENV=.env.local npx tsx scripts/verify/make-test-entity.ts list hdavidsh@gmail.com
```
Expected: 2 entities (Personal primary + the LLC).

- [ ] **Step 2: Manual pass in the running app** (`npm run dev -- -p 3001`), signed in as that lender:
  - Sidebar shows the **switcher** (it must NOT appear for a single-entity login — check a different lender to confirm).
  - Switch to the LLC → dashboard/notes go empty (it holds nothing yet). Switch back to Personal → positions return. Switch to **All entities** → everything, plus the per-entity breakdown card.
  - **Beneficiaries** tab follows the selected entity; "copy from another entity" works into the empty LLC.
  - **Tax forms** / **Loan agreement** tabs name the selected entity; "All" shows the choose-an-entity message.
  - **Register** for an open note → the "Which entity is investing?" picker appears; register as the LLC; confirm the new participation lands under the LLC (switch entities to check) and appears in the **admin pipeline**.
  - Open that note → the schedule PDF's lender name is the **LLC's** loan-agreement title, not the personal name.

- [ ] **Step 3: Clean up the real-DB test entity if unwanted**

```
VERIFY_ENV=.env.local npx tsx scripts/verify/make-test-entity.ts remove <entity_id>
```
(Refuses if it holds participations — remove the test participation first, or keep the entity.)

- [ ] **Step 4: Land**

```bash
npx tsc --noEmit && npx next build
git checkout main
git merge --no-ff feat/investor-entities-phase2 -m "Merge investor-entities Phase 2: entity switcher + entity-aware portal"
git push
git branch -d feat/investor-entities-phase2
```

---

## End state

A lender with multiple entities can switch between them (or view "All"), sees per-entity beneficiaries/W-9/loan-agreement, picks the investing entity at registration, and gets paperwork carrying that entity's legal name. A lender with ONE entity sees **no change whatsoever** — no switcher, no new UI. Phase 3 (person-centric admin, entity CRUD, merge tool) then makes entity management self-serve for admins and consolidates the duplicate logins.

## Known follow-ups (explicitly NOT in Phase 2)
- Admin entity CRUD + person-centric admin views + the merge tool → **Phase 3**.
- Admin picking *entities* (not users) for private-note visibility — today `syncVisibility` maps each selected user to their PRIMARY entity, which is wrong once a login has several. Phase 3 should let admin grant a specific entity.
- `participations.user_id` / `beneficiaries.user_id` etc. are still dual-written but no longer authoritative; drop them once Phase 3 is done.
