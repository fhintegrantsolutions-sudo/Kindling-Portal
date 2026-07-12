# Investor Entities — one login, multiple entities

**Status:** Design approved 2026-07-11 · Pre-cutover (Firestore → Supabase)
**Author:** Haley + Claude

## Problem

Today the portal assumes **one login = one investing identity**. Entity identity
(`entity_type`, `business_name`, `loan_agreement_title`, address) is stored as flat
columns on `profiles`, one row per `auth.users`, and positions attach directly to
`participations.user_id`. A person who invests personally *and* through two LLCs must
create three separate logins with three emails — which is exactly what the current data
shows (the same person appearing as multiple lender rows, e.g. personal / LLC / IRA).

The sharpest structural conflict: `participation-invite-action.ts` **overwrites** the
profile's entity fields on each conversion, so a single login could never safely hold a
second entity.

## Goal

Let **one login own multiple investor entities** (personal + business positions), with:

- an **entity switcher** and an **"All entities"** rollup in the portal;
- **entity-aware** portal reads (dashboard, notes, opportunities, profile tabs);
- **per-entity** paperwork/W-9, beneficiaries, documents, and private-note visibility;
- **reworked RLS** enforcing that a lender only ever touches entities they own;
- a one-time **migration** of the flat profile model (safe because pre-cutover);
- an admin **merge tool** to consolidate already-duplicated people on demand.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Portal view for multi-entity lender | **Switcher + "All entities" rollup** |
| Who creates/names entities | **Admin-only** (entities drive legal paperwork) |
| Existing duplicate logins | **Build capability + admin merge tool** (on-demand; no bulk auto-match) |
| Beneficiaries scope | **Per-entity**, with a "copy from another entity" shortcut |
| Documents scope | **Per-entity** |
| Private-note visibility scope | **Per-entity** (invite a specific entity to a private deal) |
| Admin presentation | **Person with entities under them** |
| Data-model shape | **Approach A** — dedicated `investor_entities` table |

## Approach A (chosen)

A dedicated `investor_entities` table cleanly separates **who logs in** (`profiles`:
email, role, legal name, referral) from **which entity holds the position**
(`investor_entities`: entity_type, business_name, loan_agreement_title, address, W-9
context). Positions move from `user_id` to `entity_id`. RLS routes through
entity ownership.

Rejected: (B) a link table over existing `profiles`, and (C) self-referential profiles —
both leave `profiles` doing double duty (auth *and* entity), which is the root cause of
today's pain and makes RLS/merge awkward.

## 1. Data model & migration

### New table `investor_entities`
One row per entity a person holds:

- `id uuid pk`
- `owner_user_id uuid not null → auth.users(id) on delete cascade` — the login that owns it
- `display_name text` — short switcher label ("Personal", "Smith LLC", "Jones IRA")
- `entity_type text` — Individual / LLC / Trust / Corp / IRA / …
- `business_name text null`
- `loan_agreement_title text null`
- `address_street / address_city / address_state / address_zip text`
- `is_primary boolean` — the person's default/personal entity (one per owner)
- `created_at / updated_at timestamptz`

### FK moves (`user_id` → `entity_id`)
Gain `entity_id uuid → investor_entities(id)`:

- `participations`
- `note_registrations`
- `beneficiaries`
- `documents`
- `note_visibility` (a specific entity is invited to a private deal)

`participation_documents`, `payments`, and the bonus/payment **payout** child tables stay
scoped *through* their participation (which now carries `entity_id`).

**Stays login-level:** `profiles` (email, role, `first_name`/`last_name`, referral),
referral codes, and referrals.

### `profiles` after migration
`profiles` becomes purely login-level. The entity columns (`entity_type`,
`business_name`, `loan_agreement_title`, `address_*`) move to `investor_entities` and are
**dropped** from `profiles`. This removes the invite-overwrite bug.

### Migration steps (pre-cutover)
1. For every existing `profiles` row, create **exactly one** `investor_entities` row
   copying its current entity fields; `is_primary = true`; `display_name` derived
   (business_name, or "Personal" for Individual).
2. Backfill `entity_id` on participations / note_registrations / beneficiaries /
   documents / note_visibility to that single entity.
3. Drop the moved columns from `profiles`.

**Safety property:** every existing login ends with exactly one entity, so the portal
behaves **identically to today** until admin merges people or adds a second entity.

## 2. Row-level security

Center everything on one idea: *"do I own this entity?"*

- **Helper function** `auth_owns_entity(entity_id uuid) → boolean` (SECURITY DEFINER):
  `exists (select 1 from investor_entities where id = entity_id and owner_user_id = auth.uid())`.
  Every entity-scoped policy calls it — the logic lives in one place, not copy-pasted
  ~20 times.
- **`investor_entities`**: lenders may `select` their own (`owner_user_id = auth.uid()`);
  **no** lender insert/update (entities are admin-managed).
- **Direct entity tables** (participations, note_registrations, beneficiaries, documents,
  note_visibility): `auth_owns_entity(entity_id)` replaces the old `user_id` check for
  read/insert/update.
- **Indirect tables** (payments, participation_documents, note_bonus payouts, note_payment
  payouts): policies join `participations → investor_entities` and check
  `owner_user_id = auth.uid()`.
- **Private-note gate**: a note is visible if *any of my entities* appears in
  `note_visibility` **or** already has a participation.
- **Admin policies unchanged** — admin sees everything.

**Security property (tested hardest):** a lender can only ever touch rows tied to an
entity they own — enforced by Postgres, not the app. A lender must never see another
login's entity, and must see **all** of their own.

## 3. Switcher & entity-scoped reads

"All entities" and "one entity" collapse into the **same query shape** — a set of entity
IDs — so the ~36 read sites change uniformly.

- **Resolver `getCurrentEntityContext()`** (DAL): reads a server-readable
  `current_entity` **cookie**; **validates** the entity is owned by `auth.uid()` (never
  trusts the cookie blindly); returns `{ mode, entityIds }`:
  - one entity selected → `entityIds = [thatId]`
  - "All entities" → `entityIds = [every entity I own]`
- **Read layer swap:** every `getMy*` goes from `.eq("user_id", user.id)` to
  `.in("entity_id", ctx.entityIds)`. Single-entity and "All" share one code path.
- **Switcher UI** (client component, top bar / sidebar): lists the person's entities +
  "All entities", writes the cookie, refreshes so server reads re-run. Default on login =
  primary entity (or last-selected).
- **Dashboard:** "All" sums across `entityIds` with a per-entity breakdown; a single
  entity filters everything to it.
- **Rule:** writes that carry legal identity (registration, paperwork) require a
  **concrete** entity, never "All."

## 4. Registration & per-entity paperwork

- **Registration form** gains a **"Which entity is investing?"** selector (defaults to the
  switcher's current entity; required when in "All" mode). On submit, `participation` and
  `note_registration` get `entity_id`, and the paperwork snapshot (`entity_type`,
  `name_for_agreement`, address) reads from the **chosen entity**. The same person can
  invest as different entities across notes — or hold two entities in the same note.
- **New-entity requests**: the form points lenders to request a new entity (admin-only
  creation).
- **Paperwork output** (amortization PDF, loan-agreement name, note detail) reads the
  **participation's entity**, not the profile.
- **New-lead setup flow**: still captures entity details inline; at invite/conversion the
  admin action **creates an `investor_entities` row** from that snapshot under the new
  login and links the participation — instead of flattening onto the profile. This is the
  single change in `participation-invite-action.ts` that removes the sharpest conflict.
- **Profile tabs become entity-aware:** Tax forms (per-entity W-9), Loan agreement
  (selected entity's identity, admin-editable only), Beneficiaries (selected entity's
  list + "copy from another entity" shortcut).

## 5. Admin views & merge tool

- **Person-centric admin:** one row per person (login), expandable to their entities.
  Participation views show *the participation's entity* identity. Note detail / participant
  lists show entity names.
- **Entity management UI:** admin creates/edits/renames a person's entities (type,
  business name, loan-agreement title, address, display label, primary flag). The invite
  flow calls this under the hood.
- **Merge tool (on-demand, admin):** because positions hang off `entity_id`, merging is
  mostly **re-pointing each absorbed entity's `owner_user_id`** to the surviving login —
  positions/beneficiaries/documents travel with their entities automatically.
  1. Admin picks the same-person logins and the **surviving login** (whose email/password
     they use going forward).
  2. **Preview** shows exactly what moves.
  3. On confirm: re-point entities to the survivor, move login-level referral data, disable
     the absorbed logins. Logged, one-way, typed confirmation.
- **Real-world call:** after merging, the person logs in with **one** email (the survivor);
  the other email can no longer sign in. The tool makes the surviving email explicit.

## 6. Phasing & safe rollout

Three coherent slices, each independently verifiable; you eyeball before the next begins.
Each phase gets its **own implementation plan** off this design doc.

- **Phase 1 — Foundation (invisible to users).** `investor_entities` table, `entity_id` on
  the five tables, the migration (one entity per profile → backfill → drop moved columns),
  the RLS rework, and the read/write-layer swap to entity context. **End state: every login
  has exactly one entity; the portal behaves identically to today.** Nothing else starts
  until the RLS harness + migration reconciliation pass. *(~1–1.5 wk)*
- **Phase 2 — Entity-aware portal.** `current_entity` cookie + resolver, switcher, "All"
  rollup, per-entity beneficiaries/tax/loan-agreement tabs, registration entity selector,
  per-entity paperwork output. **End state: an admin-created multi-entity person works end
  to end.** *(~4–6 days)*
- **Phase 3 — Admin + merge.** Person-centric admin views, entity CRUD, merge tool with
  preview. **End state: consolidate existing duplicate people on demand.** *(~3–5 days)*

### Safe-testing setup (Phase 1, first task)
No staging exists and the Supabase CLI isn't on PATH. Spin up a **scratch Supabase
project**, apply existing migrations to reach current schema, seed a small dataset, and run
the Phase-1 migration + RLS isolation harness **there** first. Only after green do we apply
to the real (pre-cutover) database — keeping the column-drops and 20-policy rewrite off the
only real dataset until proven.

## Testing

No automated test framework exists; verification is via `tsx` scripts against Supabase plus
`tsc`/`eslint`. For this security-critical work:

1. **RLS isolation harness (core, kept — not throwaway).** Seed with the service-role
   client; query as **real signed-in users** (per-user JWT, not service role). Create login
   A (two entities) and login B (one entity); seed participations, beneficiaries, documents,
   and a private note's `note_visibility` under each. Assert, as A and symmetrically as B:
   - A sees **both** of A's entities and all their rows (sees all my own hats).
   - A sees **none** of B's entity/rows.
   - A **cannot** insert/update a participation under B's entity (write isolation).
   - Private-note gate: visible to the invited entity's owner, not to B.
   - Indirect tables (payments, payouts, participation_documents) respect the same wall.
   Commit this script under `scripts/` so it re-runs whenever policies change.
2. **Migration reconciliation.** After migrating a copy: every profile → exactly one entity;
   **zero** null `entity_id` on participations/registrations/beneficiaries/documents/
   note_visibility; pre/post row counts match. Orphan = fail.
3. **App layer.** `tsc` + `eslint`, then a manual UI pass with a seeded multi-entity user:
   switcher lists entities, "All" rollup sums correctly, per-entity filter matches the DB.

## Blast radius (from exploration)

- ~36 `getMy*` call sites across 8 files; ~100 `user_id` references in `src/`.
- ~20 `auth.uid() = user_id` / `p.user_id = auth.uid()` RLS predicates across 9 migrations.
- Tables carrying a lender `user_id` today: participations, note_registrations, beneficiaries,
  documents, activities, referral_codes, referrals, note_visibility (+ two payout child
  tables via participation).
- Sharpest conflict point: `participation-invite-action.ts` (overwrites profile entity
  fields per conversion).

## Out of scope

- Bulk auto-matching of duplicate people (merge is on-demand only).
- Entity-level *logins*/credentials (entities are "hats"; one login owns them).
- New tax-ID/W-9 document storage beyond the existing per-entity "Update W-9" link
  (per-entity tax metadata can be a later increment).
