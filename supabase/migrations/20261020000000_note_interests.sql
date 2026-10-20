-- "Interested" stage for upcoming notes: from 30 days before a note's funding
-- opens, a lender can flag interest (optionally with an estimated amount) for
-- one of their entities. One row per (note, entity); withdrawing deletes it.
create table if not exists public.note_interests (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  entity_id uuid not null references public.investor_entities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  estimated_amount numeric(14,2) check (estimated_amount is null or estimated_amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (note_id, entity_id)
);

create index if not exists note_interests_note_idx on public.note_interests(note_id);

create trigger note_interests_set_updated_at before update
  on public.note_interests
  for each row execute function public.set_updated_at();

alter table public.note_interests enable row level security;

-- Lenders manage interest only for entities they own.
create policy "note_interests own"
  on public.note_interests for all
  using (public.auth_owns_entity(entity_id))
  with check (public.auth_owns_entity(entity_id) and user_id = auth.uid());

create policy "note_interests admin all"
  on public.note_interests for all
  using (public.is_admin())
  with check (public.is_admin());
