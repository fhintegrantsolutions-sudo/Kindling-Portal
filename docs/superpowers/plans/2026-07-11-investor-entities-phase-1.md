# Investor Entities — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the `investor_entities` table and move positions/paperwork/estate/docs/visibility onto `entity_id`, migrating every existing login to exactly one entity, so the portal behaves **identically to today** while the foundation for multi-entity is in place.

**Architecture:** A new `investor_entities` table holds per-entity paperwork identity (`owner_user_id → auth.users`). `participations`, `note_registrations`, `beneficiaries`, `documents`, `note_visibility` gain a nullable `entity_id`. RLS routes entity-scoped reads/writes through a `auth_owns_entity()` helper. The app read layer resolves a "current entity context" (in Phase 1 always the login's single primary entity) and swaps `.eq("user_id", user.id)` for `.in("entity_id", ctx.entityIds)`. Profile/registration reads+writes repoint from the flat profile columns to the primary entity, after which those columns are dropped from `profiles`.

**Tech Stack:** Next.js 16 (App Router, server actions), Supabase Postgres + RLS, `@supabase/ssr`, TypeScript. No unit-test framework — verification is via `npx tsx` scripts run against Supabase, plus `npx tsc --noEmit` and `npx eslint`. Migrations are applied by pasting SQL into the Supabase SQL editor (no CLI on PATH).

**Critical ordering constraint:** `profiles.entity_type / business_name / loan_agreement_title / address_*` cannot be dropped until **all** app code stops reading/writing them (Tasks 8–11). The column-drop migration is therefore the **last** DB change (Task 12), applied only after the app changes are merged and verified.

**Migration application rule (every migration task):** apply the SQL to the **staging Supabase project first** (Task 1), run the relevant verification script, and only then apply the identical SQL to the real project. Never apply an unverified migration to the real database.

---

## File structure

**New files**
- `supabase/migrations/20260712000000_investor_entities_add.sql` — table + nullable `entity_id` columns + indexes + trigger (additive, reversible).
- `supabase/migrations/20260712000001_investor_entities_backfill.sql` — one entity per profile; backfill `entity_id`.
- `supabase/migrations/20260712000002_investor_entities_rls.sql` — `auth_owns_entity()` + policy rewrites.
- `supabase/migrations/20260712000003_profiles_drop_entity_cols.sql` — drop moved columns from `profiles` (**applied last**, Task 12).
- `scripts/verify/entity-reconciliation.ts` — **kept** migration-reconciliation check.
- `scripts/verify/entity-rls-isolation.ts` — **kept** RLS isolation harness.
- `src/lib/entities/context.ts` — `getCurrentEntityContext()` resolver + helpers.
- `docs/superpowers/plans/staging-supabase-setup.md` — how to stand up the staging DB.

**Modified files**
- `src/lib/db/queries.ts` — `getMy*` read swaps to `entity_id`.
- `src/lib/db/queries.ts` / `src/lib/dal.ts` — add entity-aware profile/entity reads.
- `src/lib/profile/actions.ts` + `src/app/(protected)/profile/page.tsx` + `.../loan-agreement/page.tsx` + `.../profile-form.tsx` — read/write address & loan-agreement identity from the primary entity.
- `src/lib/registration/actions.ts` — read entity fields from the primary entity; set `entity_id` on inserts.
- `src/lib/lead/actions.ts` — set `entity_id` (null until invite) unchanged inserts, plus registration snapshot parity.
- `src/lib/admin/participation-invite-action.ts` — create an `investor_entities` row at conversion and link `entity_id` instead of flattening onto `profiles`.
- `src/lib/db/admin-queries.ts` — repoint the admin reads of lender `entity_type`/`business_name`/`loan_agreement_title` to the entity (minimal, to keep admin working).

---

## Task 0: Staging Supabase project + verification harness folder

**Files:**
- Create: `docs/superpowers/plans/staging-supabase-setup.md`
- Create: `scripts/verify/.gitkeep`

- [ ] **Step 1: Write the staging-setup doc**

Create `docs/superpowers/plans/staging-supabase-setup.md` with:

```markdown
# Staging Supabase project (Phase 1 testing)

Purpose: trial the entity migration + RLS on a throwaway copy before touching the
real (pre-cutover) database. Supabase CLI is not on PATH, so we use a second
hosted project.

## One-time setup
1. Create a new free Supabase project ("kindling-staging").
2. In the SQL editor, apply every file in `supabase/migrations/` **in filename
   order**, up to and including the current head, to reach today's schema.
3. Seed a minimal dataset (2 auth users, 1–2 notes, a few participations,
   beneficiaries, documents, one private note_visibility row). Use the SQL in
   `scripts/verify/seed-staging.sql` if present, or create by hand.
4. Copy the staging project's URL + service_role key + anon key into a local
   `.env.staging` (gitignored) as:
   - STAGING_SUPABASE_URL
   - STAGING_SERVICE_ROLE_KEY
   - STAGING_ANON_KEY

## Per-migration workflow
- Paste the migration SQL into the staging SQL editor.
- Run the relevant `scripts/verify/*.ts` against `.env.staging`.
- Only when green, apply the same SQL to the real project's SQL editor.
```

- [ ] **Step 2: Keep the verify folder tracked**

Create an empty `scripts/verify/.gitkeep`.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/staging-supabase-setup.md scripts/verify/.gitkeep
git commit -m "docs: staging Supabase setup for entity migration testing"
```

> **Human action (not a code step):** actually create the staging project and seed it per the doc before running any verification script below. The plan's verification steps assume it exists.

---

## Task 1: Additive migration — `investor_entities` + nullable `entity_id`

**Files:**
- Create: `supabase/migrations/20260712000000_investor_entities_add.sql`

- [ ] **Step 1: Write the additive migration**

```sql
-- Investor entities: one login (auth.users) owns N entities. This migration is
-- purely additive and reversible — it creates the table and nullable entity_id
-- FKs, changing no existing behavior.

create table public.investor_entities (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  entity_type text,
  business_name text,
  loan_agreement_title text,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index investor_entities_owner_idx
  on public.investor_entities(owner_user_id);

-- At most one primary entity per owner.
create unique index investor_entities_one_primary_idx
  on public.investor_entities(owner_user_id) where is_primary;

create trigger investor_entities_set_updated_at before update
  on public.investor_entities
  for each row execute function public.set_updated_at();

alter table public.investor_entities enable row level security;

-- Nullable entity_id on the five entity-scoped tables (nullable so this migration
-- is safe to run before backfill, and so un-converted lead rows can stay null).
alter table public.participations
  add column entity_id uuid references public.investor_entities(id);
alter table public.note_registrations
  add column entity_id uuid references public.investor_entities(id);
alter table public.beneficiaries
  add column entity_id uuid references public.investor_entities(id);
alter table public.documents
  add column entity_id uuid references public.investor_entities(id);
alter table public.note_visibility
  add column entity_id uuid references public.investor_entities(id);

create index participations_entity_idx on public.participations(entity_id);
create index note_registrations_entity_idx on public.note_registrations(entity_id);
create index beneficiaries_entity_idx on public.beneficiaries(entity_id);
create index documents_entity_idx on public.documents(entity_id);
create index note_visibility_entity_idx on public.note_visibility(entity_id);
```

- [ ] **Step 2: Apply to staging and verify the objects exist**

Paste the SQL into the **staging** SQL editor. Then run this ad-hoc check in the staging SQL editor:

```sql
select count(*) as entities from public.investor_entities;               -- expect 0
select column_name from information_schema.columns
  where table_name = 'participations' and column_name = 'entity_id';     -- expect 1 row
```
Expected: `entities = 0`; the `entity_id` column exists on `participations` (repeat spot-check for the other four tables).

- [ ] **Step 3: Apply to the real project**

Paste the identical SQL into the **real** project's SQL editor. Re-run the same two checks there. Expected: identical results.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260712000000_investor_entities_add.sql
git commit -m "feat(db): add investor_entities table + nullable entity_id FKs"
```

---

## Task 2: Backfill migration — one entity per profile + populate `entity_id`

**Files:**
- Create: `supabase/migrations/20260712000001_investor_entities_backfill.sql`

- [ ] **Step 1: Write the backfill migration**

```sql
-- One entity per existing profile, carrying its current flat identity fields.
-- display_name: business_name if present, else "Personal" for Individual/unknown,
-- else the entity_type label.
insert into public.investor_entities
  (owner_user_id, display_name, entity_type, business_name, loan_agreement_title,
   address_street, address_city, address_state, address_zip, is_primary)
select
  p.id,
  coalesce(
    nullif(btrim(p.business_name), ''),
    case
      when p.entity_type is null or p.entity_type = 'Individual' then 'Personal'
      else p.entity_type
    end
  ),
  p.entity_type,
  p.business_name,
  p.loan_agreement_title,
  p.address_street, p.address_city, p.address_state, p.address_zip,
  true
from public.profiles p
where not exists (
  select 1 from public.investor_entities e where e.owner_user_id = p.id
);

-- Backfill entity_id from the owner's (single) primary entity. Rows whose
-- user_id is null (un-converted leads) intentionally keep entity_id null — they
-- get an entity at invite time (later phase / Task 11).
update public.participations t
  set entity_id = e.id
  from public.investor_entities e
  where e.owner_user_id = t.user_id and e.is_primary and t.entity_id is null;

update public.note_registrations t
  set entity_id = e.id
  from public.investor_entities e
  where e.owner_user_id = t.user_id and e.is_primary and t.entity_id is null;

update public.beneficiaries t
  set entity_id = e.id
  from public.investor_entities e
  where e.owner_user_id = t.user_id and e.is_primary and t.entity_id is null;

update public.documents t
  set entity_id = e.id
  from public.investor_entities e
  where e.owner_user_id = t.user_id and e.is_primary and t.entity_id is null;

update public.note_visibility t
  set entity_id = e.id
  from public.investor_entities e
  where e.owner_user_id = t.user_id and e.is_primary and t.entity_id is null;
```

- [ ] **Step 2: Apply to staging only (do NOT apply to real yet)**

Paste into the **staging** SQL editor. The reconciliation script (Task 3) must pass on staging before this touches the real DB.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260712000001_investor_entities_backfill.sql
git commit -m "feat(db): backfill one investor_entity per profile + entity_id"
```

---

## Task 3: Migration reconciliation script (kept)

**Files:**
- Create: `scripts/verify/entity-reconciliation.ts`

- [ ] **Step 1: Write the reconciliation script**

```ts
import { config } from "dotenv";
config({ path: process.env.VERIFY_ENV ?? ".env.staging" });
import { createClient } from "@supabase/supabase-js";

const url = process.env.STAGING_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.STAGING_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, key);

async function count(table: string, filter?: (q: any) => any): Promise<number> {
  let q = db.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function main() {
  let failures = 0;
  const fail = (m: string) => { console.log(`FAIL: ${m}`); failures++; };
  const ok = (m: string) => console.log(`ok:   ${m}`);

  // 1. Every profile has exactly one entity.
  const profiles = await count("profiles");
  const entities = await count("investor_entities");
  const primaries = await count("investor_entities", (q) => q.eq("is_primary", true));
  profiles === entities ? ok(`entities == profiles (${entities})`)
                        : fail(`entities ${entities} != profiles ${profiles}`);
  primaries === profiles ? ok(`primaries == profiles (${primaries})`)
                         : fail(`primaries ${primaries} != profiles ${profiles}`);

  // 2. No row WITH a user_id is missing entity_id.
  for (const table of ["participations", "note_registrations", "beneficiaries", "documents", "note_visibility"]) {
    const orphans = await count(table, (q) => q.not("user_id", "is", null).is("entity_id", null));
    orphans === 0 ? ok(`${table}: no user_id rows missing entity_id`)
                  : fail(`${table}: ${orphans} rows have user_id but null entity_id`);
  }

  // 3. Every non-null entity_id points at an entity owned by that row's user_id.
  //    (Sample check via a SQL RPC-free join using the service client.)
  for (const table of ["participations", "beneficiaries"]) {
    const { data, error } = await db
      .from(table)
      .select("user_id, entity:investor_entities!inner(owner_user_id)")
      .not("entity_id", "is", null)
      .limit(1000);
    if (error) throw new Error(`${table} join: ${error.message}`);
    const mismatched = (data ?? []).filter(
      (r: any) => r.user_id && r.entity?.owner_user_id && r.user_id !== r.entity.owner_user_id,
    ).length;
    mismatched === 0 ? ok(`${table}: entity owner matches user_id`)
                     : fail(`${table}: ${mismatched} rows where entity owner != user_id`);
  }

  console.log(failures === 0 ? "\nRECONCILIATION PASS" : `\nRECONCILIATION FAIL (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run against staging (post-backfill) — expect PASS**

Run: `VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-reconciliation.ts`
Expected: all `ok:` lines, ends with `RECONCILIATION PASS`, exit 0.

- [ ] **Step 3: Now apply the Task 2 backfill SQL to the REAL project, then run reconciliation against it**

Paste `20260712000001_investor_entities_backfill.sql` into the **real** SQL editor.
Run: `VERIFY_ENV=.env.local npx tsx scripts/verify/entity-reconciliation.ts`
(Ensure `.env.local` maps `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`; the script falls back to those.)
Expected: `RECONCILIATION PASS`.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify/entity-reconciliation.ts
git commit -m "test(db): kept entity migration reconciliation script"
```

---

## Task 4: RLS migration — `auth_owns_entity()` + policy rewrites

**Files:**
- Create: `supabase/migrations/20260712000002_investor_entities_rls.sql`

- [ ] **Step 1: Write the RLS migration**

```sql
-- Ownership helper: does the current user own this entity? SECURITY DEFINER so
-- the policy can read investor_entities without recursing through its own RLS.
create or replace function public.auth_owns_entity(p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.investor_entities e
    where e.id = p_entity_id and e.owner_user_id = auth.uid()
  );
$$;

-- investor_entities: lenders read their own; no lender writes (admin-managed).
create policy "entities read own" on public.investor_entities
  for select using (owner_user_id = auth.uid());

-- Direct entity tables: replace user_id checks with entity ownership. Drop the
-- old policies by name and recreate. (Policy names below match the current
-- schema; confirm exact names in the referenced migrations before running.)

-- participations
drop policy if exists "participations read own" on public.participations;
create policy "participations read own" on public.participations
  for select using (public.auth_owns_entity(entity_id));
drop policy if exists "participations lender insert" on public.participations;
create policy "participations lender insert" on public.participations
  for insert with check (public.auth_owns_entity(entity_id));
drop policy if exists "participations lender update" on public.participations;
create policy "participations lender update" on public.participations
  for update using (public.auth_owns_entity(entity_id))
  with check (public.auth_owns_entity(entity_id));

-- beneficiaries
drop policy if exists "beneficiaries own" on public.beneficiaries;
create policy "beneficiaries own" on public.beneficiaries
  for all using (public.auth_owns_entity(entity_id))
  with check (public.auth_owns_entity(entity_id));

-- documents
drop policy if exists "documents own" on public.documents;
create policy "documents own" on public.documents
  for all using (public.auth_owns_entity(entity_id))
  with check (public.auth_owns_entity(entity_id));

-- note_visibility (read own; the private-note gate below uses entity ownership)
drop policy if exists "note_visibility read own" on public.note_visibility;
create policy "note_visibility read own" on public.note_visibility
  for select using (public.auth_owns_entity(entity_id));

-- note_registrations read own (insert stays token-aware from 20260507000004;
-- only the self-serve read/insert-own predicate changes to entity ownership).
drop policy if exists "note_registrations read own" on public.note_registrations;
create policy "note_registrations read own" on public.note_registrations
  for select using (public.auth_owns_entity(entity_id));

-- Indirect tables: route through participations -> investor_entities.
-- payments
drop policy if exists "payments read own" on public.payments;
create policy "payments read own" on public.payments
  for select using (exists (
    select 1 from public.participations p
    join public.investor_entities e on e.id = p.entity_id
    where p.id = payments.participation_id and e.owner_user_id = auth.uid()
  ));

-- participation_documents
drop policy if exists "participation_documents read own" on public.participation_documents;
create policy "participation_documents read own" on public.participation_documents
  for select using (exists (
    select 1 from public.participations p
    join public.investor_entities e on e.id = p.entity_id
    where p.id = participation_documents.participation_id and e.owner_user_id = auth.uid()
  ));

-- Private-note visibility gate on notes: visible if any of my entities is in
-- note_visibility for the note OR already has a participation in it. (Recreate
-- the existing notes visibility policy from 20260507000005 with entity checks.)
drop policy if exists "notes visible to allowed" on public.notes;
create policy "notes visible to allowed" on public.notes
  for select using (
    is_private = false
    or exists (
      select 1 from public.note_visibility v
      join public.investor_entities e on e.id = v.entity_id
      where v.note_id = notes.id and e.owner_user_id = auth.uid()
    )
    or exists (
      select 1 from public.participations p
      join public.investor_entities e on e.id = p.entity_id
      where p.note_id = notes.id and e.owner_user_id = auth.uid()
    )
    -- admins keep full access via their existing admin policy
  );
```

> **Executor note:** before running, open `20260505000001_domain_schema.sql`,
> `20260507000005_private_notes.sql`, `20260507000007_note_bonuses.sql`,
> `20260507000009_*`, `20260515000000/1_*` and confirm the **exact** policy names
> to drop. Names in this migration are the design intent; match them to reality
> so `drop policy if exists` actually removes the old ones. Also recreate the
> **note_bonus payout** and **note_payment payout** select policies with the same
> `participations -> investor_entities` join shown above (they currently use
> `p.user_id = auth.uid()`).

- [ ] **Step 2: Apply to staging, then run the RLS harness (Task 5) — do not touch real yet**

Paste into the **staging** SQL editor. The RLS isolation harness (Task 5) must pass on staging before this touches real.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260712000002_investor_entities_rls.sql
git commit -m "feat(db): entity-ownership RLS (auth_owns_entity) rewrite"
```

---

## Task 5: RLS isolation harness (kept)

**Files:**
- Create: `scripts/verify/entity-rls-isolation.ts`

- [ ] **Step 1: Write the harness**

```ts
import { config } from "dotenv";
config({ path: process.env.VERIFY_ENV ?? ".env.staging" });
import { createClient } from "@supabase/supabase-js";

const url = process.env.STAGING_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.STAGING_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.STAGING_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

let failures = 0;
const fail = (m: string) => { console.log(`FAIL: ${m}`); failures++; };
const ok = (m: string) => console.log(`ok:   ${m}`);

// Sign in as a seeded user and return an RLS-scoped client bound to their JWT.
async function asUser(email: string, password: string) {
  const c = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`sign-in ${email}: ${error?.message}`);
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  // The seed (created via admin/service client in staging setup) must provide:
  //   userA (2 entities: A1 primary, A2), userB (1 entity: B1),
  //   participations under A1, A2, B1; a private note visible to A1 only.
  const A_EMAIL = "rls-a@example.com", A_PW = "Test-pass-A1!";
  const B_EMAIL = "rls-b@example.com", B_PW = "Test-pass-B1!";

  const a = await asUser(A_EMAIL, A_PW);
  const b = await asUser(B_EMAIL, B_PW);

  // A sees BOTH its entities.
  const { data: aEnt } = await a.from("investor_entities").select("id, display_name");
  (aEnt?.length ?? 0) >= 2 ? ok(`A sees ${aEnt!.length} entities (>=2)`)
                           : fail(`A sees ${aEnt?.length ?? 0} entities, expected >=2`);

  // A sees participations across BOTH entities (its own hats).
  const { data: aParts } = await a.from("participations").select("id, entity_id");
  const aEntityIds = new Set((aEnt ?? []).map((e) => e.id));
  const aAllOwned = (aParts ?? []).every((p) => p.entity_id && aEntityIds.has(p.entity_id));
  aAllOwned && (aParts?.length ?? 0) >= 2
    ? ok(`A sees its participations across entities (${aParts!.length})`)
    : fail(`A participations wrong: ${JSON.stringify(aParts)}`);

  // A sees NONE of B's entities/participations.
  const { data: aSeesB } = await a.from("investor_entities").select("id").eq("owner_user_id",
    (await admin.from("investor_entities").select("owner_user_id").eq("display_name", "B1").single()).data!.owner_user_id);
  (aSeesB?.length ?? 0) === 0 ? ok("A cannot see B's entity")
                              : fail(`A sees B entity rows: ${aSeesB?.length}`);

  // A cannot INSERT a participation under B's entity (write isolation).
  const { data: b1 } = await admin.from("investor_entities").select("id").eq("display_name", "B1").single();
  const anyNote = (await admin.from("notes").select("id").limit(1).single()).data!;
  const { error: insErr } = await a.from("participations").insert({
    entity_id: b1!.id, note_id: anyNote.id, invested_amount: "1", status: "Active",
  });
  insErr ? ok("A blocked from inserting under B's entity")
         : fail("A INSERTED a participation under B's entity (RLS hole!)");

  // Private-note gate: A (invited via A1) sees it; B does not.
  const { data: privNote } = await admin.from("notes").select("id, note_id").eq("is_private", true).limit(1).maybeSingle();
  if (privNote) {
    const { data: aNote } = await a.from("notes").select("id").eq("id", privNote.id).maybeSingle();
    const { data: bNote } = await b.from("notes").select("id").eq("id", privNote.id).maybeSingle();
    aNote ? ok("A sees the private note (invited entity)") : fail("A cannot see its private note");
    !bNote ? ok("B cannot see A's private note") : fail("B sees a private note it wasn't invited to");
  } else {
    console.log("warn: no private note seeded; skipping gate check");
  }

  console.log(failures === 0 ? "\nRLS ISOLATION PASS" : `\nRLS ISOLATION FAIL (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run against staging — expect PASS**

Run: `VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-rls-isolation.ts`
Expected: all `ok:` lines, `RLS ISOLATION PASS`, exit 0. If any `FAIL`, fix the RLS migration (Task 4) and re-apply to staging before continuing.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify/entity-rls-isolation.ts
git commit -m "test(db): kept RLS entity-isolation harness"
```

> **Do NOT apply the RLS migration to the real project yet.** It depends on the
> app read layer already sending `entity_id` (Tasks 6–11). Apply RLS to real in
> Task 12, after the app is entity-aware, so nothing breaks mid-deploy.

---

## Task 6: Entity context resolver

**Files:**
- Create: `src/lib/entities/context.ts`

- [ ] **Step 1: Write the resolver**

```ts
import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const CURRENT_ENTITY_COOKIE = "current_entity";
export const ALL_ENTITIES = "all";

export type EntityContext = {
  mode: "all" | "one";
  currentEntityId: string | null; // null in "all" mode
  entityIds: string[]; // all owned in "all" mode; [currentEntityId] in "one"
  entities: { id: string; display_name: string; is_primary: boolean }[];
};

// Resolve the logged-in user's entity context from the current_entity cookie.
// Always validates ownership — never trusts the cookie. In Phase 1 every login
// owns exactly one entity, so this reliably yields that single entity.
export async function getCurrentEntityContext(): Promise<EntityContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .from("investor_entities")
    .select("id, display_name, is_primary")
    .eq("owner_user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("display_name", { ascending: true });
  const entities = rows ?? [];
  if (entities.length === 0) {
    return { mode: "one", currentEntityId: null, entityIds: [], entities: [] };
  }

  const allIds = entities.map((e) => e.id);
  const cookieStore = await cookies();
  const raw = cookieStore.get(CURRENT_ENTITY_COOKIE)?.value ?? null;

  if (raw === ALL_ENTITIES) {
    return { mode: "all", currentEntityId: null, entityIds: allIds, entities };
  }
  // Only honor the cookie if it names an entity the user actually owns.
  const chosen = raw && allIds.includes(raw)
    ? raw
    : (entities.find((e) => e.is_primary)?.id ?? entities[0].id);
  return { mode: "one", currentEntityId: chosen, entityIds: [chosen], entities };
}

// Convenience: the concrete entity to use for a WRITE (registration/paperwork).
// Returns the selected entity, or the primary when in "all" mode.
export async function getWriteEntityId(): Promise<string | null> {
  const ctx = await getCurrentEntityContext();
  if (!ctx || ctx.entities.length === 0) return null;
  if (ctx.mode === "one") return ctx.currentEntityId;
  return ctx.entities.find((e) => e.is_primary)?.id ?? ctx.entities[0].id;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: `tsc OK` (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/entities/context.ts
git commit -m "feat(entities): current-entity context resolver"
```

---

## Task 7: Swap the `getMy*` read layer to entity context

**Files:**
- Modify: `src/lib/db/queries.ts`

For **each** function below, add at the top (after the `user` guard) a context read, and replace the `user_id` filter with an `entity_id` filter. The transformation is uniform:

```ts
// BEFORE
const { data: { user } } = await supabase.auth.getUser();
if (!user) return [];
const { data } = await supabase.from("participations").select(`...`)
  .eq("user_id", user.id)
  .order(...);

// AFTER
const ctx = await getCurrentEntityContext();
if (!ctx || ctx.entityIds.length === 0) return [];
const { data } = await supabase.from("participations").select(`...`)
  .in("entity_id", ctx.entityIds)
  .order(...);
```

- [ ] **Step 1: Import the resolver**

At the top of `src/lib/db/queries.ts` add:

```ts
import { getCurrentEntityContext } from "@/lib/entities/context";
```

- [ ] **Step 2: Apply the swap to each user-scoped function**

Apply the BEFORE→AFTER transform to these functions (line numbers are current-HEAD references; match the actual `.eq("user_id", ...)` in each):

- `getMyParticipations` (queries.ts:43, filter at :76)
- `getMyMonthlyCashflow` (:93, filter at :108)
- `getMyTotalMonthlyPayment` (:184, filter at :197)
- `getMyParticipationByNoteId` (:371, filter at :389) — keep the `note_id` `.eq`, add `.in("entity_id", ctx.entityIds)` and drop `.eq("user_id", ...)`.
- `getMyBeneficiaries` (:571, filter at :580) — `.in("entity_id", ctx.entityIds)`.
- `getBeneficiaryById` (:636, filter at :646) — replace `.eq("user_id", user.id)` with `.in("entity_id", ctx.entityIds)` (keep `.eq("id", id)`).
- `getMyRegistrationByNoteId` (:651, filter at :662) — `.in("entity_id", ctx.entityIds)` (keep note filter).

For `getMyScheduleForNote` (:408) and `getMyBonusPayoutsForParticipation` (:523): these are already scoped by a `participationId` the caller obtained via an entity-scoped read, so they need **no** `user_id`→`entity_id` change — leave as-is. `getMyReferralCode`/`getMyReferrals` are **login-level** (referrer_id) — leave as-is.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/lib/db/queries.ts`
Expected: `tsc OK`; no eslint errors.

- [ ] **Step 4: Behaviour check against staging (single-entity == identical)**

Because each login owns one entity, `entityIds = [primary]` and results must match the old `user_id` scoping. Sign in to the staging DB via the running app (or a quick tsx read) as a seeded user and confirm `getMyParticipations` returns the same rows as before. Expected: identical row set.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries.ts
git commit -m "feat(entities): scope getMy* reads by entity context"
```

---

## Task 8: Repoint the profile address form to the primary entity

**Files:**
- Modify: `src/lib/profile/actions.ts`
- Modify: `src/app/(protected)/profile/page.tsx`
- Modify: `src/app/(protected)/profile/loan-agreement/page.tsx`

Address and loan-agreement identity now live on the entity. In Phase 1 the login has one entity, so "the primary entity" is unambiguous.

- [ ] **Step 1: Read address defaults from the primary entity (Profile info page)**

In `src/app/(protected)/profile/page.tsx`, replace the `address_*` values passed to `ProfileForm` with values read from the primary entity. Add:

```ts
import { getCurrentEntityContext } from "@/lib/entities/context";
```
Fetch the primary entity's address and pass it into `defaults` in place of `profile?.address_*`. (Phone/name stay from `profiles`.)

- [ ] **Step 2: Write address to the primary entity (updateProfile action)**

In `src/lib/profile/actions.ts`, change the update so `address_street/city/state/zip` are written to the owner's primary `investor_entities` row (not `profiles`), while `phone` still updates `profiles`. The address-changed detection (for the W-9 prompt) compares the entity's prior address to the new values.

```ts
// after loading user:
const { data: entity } = await supabase
  .from("investor_entities")
  .select("id, address_street, address_city, address_state, address_zip")
  .eq("owner_user_id", user.id)
  .eq("is_primary", true)
  .maybeSingle();

// update phone on profiles:
await supabase.from("profiles").update({ phone: ... }).eq("id", user.id);

// update address on the entity:
if (entity) {
  await supabase.from("investor_entities").update({
    address_street, address_city, address_state, address_zip,
  }).eq("id", entity.id);
}

const addressChanged = !!entity && (
  (entity.address_street ?? null) !== address_street ||
  (entity.address_city ?? null) !== address_city ||
  (entity.address_state ?? null) !== address_state ||
  (entity.address_zip ?? null) !== address_zip
);
```

- [ ] **Step 3: Repoint the Loan agreement tab to the primary entity**

In `src/app/(protected)/profile/loan-agreement/page.tsx`, read `entity_type`, `business_name`, `loan_agreement_title` from the primary `investor_entities` row instead of `getCurrentProfile()`.

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/lib/profile/actions.ts "src/app/(protected)/profile/page.tsx" "src/app/(protected)/profile/loan-agreement/page.tsx"`
Expected: `tsc OK`; no eslint errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile/actions.ts "src/app/(protected)/profile/page.tsx" "src/app/(protected)/profile/loan-agreement/page.tsx"
git commit -m "feat(entities): profile address + loan-agreement read/write via primary entity"
```

---

## Task 9: Registration + lead + invite write `entity_id`

**Files:**
- Modify: `src/lib/registration/actions.ts`
- Modify: `src/lib/lead/actions.ts`
- Modify: `src/lib/admin/participation-invite-action.ts`

- [ ] **Step 1: Registration reads identity from the primary entity and sets `entity_id`**

In `src/lib/registration/actions.ts` (currently reads entity fields from `profiles` at :148-181 and inserts at :183-208):
- Read `entity_type`, `loan_agreement_title`, address, plus the person's name/phone/email. Name/phone/email stay from `profiles`; **`entity_type`, `loan_agreement_title`, address come from the primary `investor_entities` row.**
- Add `import { getWriteEntityId } from "@/lib/entities/context";` and resolve `const entityId = await getWriteEntityId();` (error out if null).
- Add `entity_id: entityId` to **both** the `note_registrations` insert (after :198) and the `participations` insert (after :207). Keep `user_id: user.id` for now (dual-written; dropped in a later phase).

- [ ] **Step 2: Invite flow creates an entity instead of flattening the profile**

In `src/lib/admin/participation-invite-action.ts` (currently copies entity fields onto `profiles` at :92-114 and backfills `participations.user_id` at :117-119):
- After the user is created, **insert an `investor_entities` row** for `newUserId` from the note_registration snapshot (`entity_type`, `business_name`, `name_for_agreement → loan_agreement_title`, address), `is_primary = true`, `display_name` derived.
- Set the participation's `entity_id` (and `user_id`) to the new entity/user.
- **Remove** the writes of `entity_type`/`business_name`/`loan_agreement_title`/`address_*` onto `profiles` (those columns are going away in Task 12). Keep writing `first_name`/`last_name`/`phone` to `profiles`.

- [ ] **Step 3: Lead flow parity**

In `src/lib/lead/actions.ts`, the lead inserts keep `user_id: null` / `entity_id: null` (an entity is created at invite, Step 2). No entity write here — confirm the inserts still compile with the new nullable `entity_id` column (no change needed).

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/lib/registration/actions.ts src/lib/lead/actions.ts src/lib/admin/participation-invite-action.ts`
Expected: `tsc OK`; no eslint errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/registration/actions.ts src/lib/lead/actions.ts src/lib/admin/participation-invite-action.ts
git commit -m "feat(entities): registration/invite write entity_id; invite creates entity"
```

---

## Task 10: Repoint admin lender-identity reads to the entity

**Files:**
- Modify: `src/lib/db/admin-queries.ts`

Admin views read lender `entity_type`/`business_name`/`loan_agreement_title` off `profiles` in several places (e.g. :213, :250, :316-377, :555-556, :1589). Since those columns are dropped in Task 12, these must read from the participation's entity (or the person's primary entity where there's no participation context).

- [ ] **Step 1: Repoint the participation-detail lender identity**

In `getParticipationById` (admin-queries.ts:424) the `lender` block reads `profiles`. Add the participation's `entity_id` to the select, and read `entity_type`/`business_name`/`loan_agreement_title`/address from `investor_entities` by that `entity_id` (fall back to the owner's primary entity if `entity_id` is null). Keep name/email/phone from `profiles`/`access_requests`.

- [ ] **Step 2: Repoint list/ledger reads**

For each admin read that currently pulls `entity_type`/`business_name`/`loan_agreement_title` from `profiles` (the sites above), switch the source to `investor_entities` joined via the row's `entity_id` (participations) or the owner's primary entity (user-level lists). Where a participation lacks `entity_id` (un-converted lead), fall back to the `note_registrations` snapshot already present.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/lib/db/admin-queries.ts`
Expected: `tsc OK`; no eslint errors.

- [ ] **Step 4: Grep guard — no remaining profile entity-column reads**

Run: `grep -rn "profiles" src | grep -E "entity_type|business_name|loan_agreement_title|address_street|address_city|address_state|address_zip"`
Expected: **no** results that read these columns off `profiles` (only `investor_entities` reads remain). Fix any stragglers before continuing — Task 12 drops these columns and any missed reader will 400 at runtime.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/admin-queries.ts
git commit -m "feat(entities): admin reads lender identity from investor_entities"
```

---

## Task 11: Merge app changes, then apply RLS to real, then drop profile columns

**Files:**
- Create: `supabase/migrations/20260712000003_profiles_drop_entity_cols.sql`

- [ ] **Step 1: Full typecheck + lint of the branch**

Run: `npx tsc --noEmit && npx eslint src`
Expected: `tsc OK`; no eslint errors.

- [ ] **Step 2: Re-run both verification harnesses against staging**

Run:
```
VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-reconciliation.ts
VERIFY_ENV=.env.staging npx tsx scripts/verify/entity-rls-isolation.ts
```
Expected: `RECONCILIATION PASS` and `RLS ISOLATION PASS`.

- [ ] **Step 3: Apply the RLS migration to the REAL project**

Paste `20260712000002_investor_entities_rls.sql` into the **real** SQL editor (the app now sends `entity_id`, so this is safe). Then run reconciliation + a read smoke-test against real:
```
VERIFY_ENV=.env.local npx tsx scripts/verify/entity-reconciliation.ts
```
Expected: `RECONCILIATION PASS`. Manually load the running app against the real DB as a lender and confirm dashboard/notes/beneficiaries/profile all render as before.

- [ ] **Step 4: Write the drop-columns migration**

```sql
-- The entity identity now lives on investor_entities and all readers/writers
-- have been repointed (verified via grep guard + manual smoke test). Drop the
-- now-unused flat columns from profiles.
alter table public.profiles
  drop column if exists entity_type,
  drop column if exists business_name,
  drop column if exists loan_agreement_title,
  drop column if exists address_street,
  drop column if exists address_city,
  drop column if exists address_state,
  drop column if exists address_zip;
```

- [ ] **Step 5: Apply drop-columns to staging, run tsc + harnesses, then apply to real**

Paste into **staging** SQL editor. Run `npx tsc --noEmit` and both harnesses (`.env.staging`) — expect all green. Then paste into the **real** SQL editor and re-run reconciliation (`.env.local`) + manual smoke test. Expected: all green; portal still behaves identically.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260712000003_profiles_drop_entity_cols.sql
git commit -m "feat(db): drop moved entity columns from profiles"
```

---

## Task 12: Land Phase 1

**Files:** none (git only)

- [ ] **Step 1: Final full check**

Run: `npx tsc --noEmit && npx eslint src`
Expected: `tsc OK`; no eslint errors.

- [ ] **Step 2: Merge to main**

```bash
git checkout main
git merge --no-ff feat/investor-entities-phase1 -m "Merge investor-entities Phase 1: entity foundation + migration + RLS"
git push
git branch -d feat/investor-entities-phase1
```

- [ ] **Step 3: Confirm end state**

- Every login owns exactly one entity (reconciliation PASS on real).
- RLS isolation PASS on staging; manual lender smoke test on real shows dashboard, notes, opportunities, beneficiaries, profile, and registration all behaving **identically to before**.
- `profiles` no longer has the entity columns; nothing in `src` reads them (grep guard clean).

---

## End state

Phase 1 is done when: `investor_entities` exists with one primary entity per login; `entity_id` is populated on all participations/registrations/beneficiaries/documents/note_visibility that have an owner; RLS enforces entity ownership (harness PASS); the app reads/writes through the single primary entity; the flat entity columns are gone from `profiles`; and a lender's portal is visually and functionally unchanged. Phase 2 (switcher + multi-entity UX) builds directly on this.
