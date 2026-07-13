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
