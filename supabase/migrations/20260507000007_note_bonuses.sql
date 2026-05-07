-- Profit bonuses on notes.
--
-- A note can have zero or more bonus events; some notes never pay any.
-- When admin records a bonus, we *snapshot* per-participation payouts at that
-- moment so the record stays correct even if shares later change. Editing a
-- bonus's amount would require recomputing the whole snapshot, so v1 supports
-- create + delete only — fix typos by deleting and re-adding.

create table public.note_bonuses (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  paid_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index note_bonuses_note_id_idx on public.note_bonuses(note_id);
create index note_bonuses_paid_date_idx on public.note_bonuses(paid_date desc);

create table public.participation_bonus_payouts (
  id uuid primary key default gen_random_uuid(),
  bonus_id uuid not null references public.note_bonuses(id) on delete cascade,
  participation_id uuid not null references public.participations(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  share_basis numeric(14,2) not null,
  created_at timestamptz not null default now(),
  unique (bonus_id, participation_id)
);

create index participation_bonus_payouts_participation_id_idx
  on public.participation_bonus_payouts(participation_id);
create index participation_bonus_payouts_bonus_id_idx
  on public.participation_bonus_payouts(bonus_id);

alter table public.note_bonuses enable row level security;
alter table public.participation_bonus_payouts enable row level security;

-- Admins manage bonuses; lenders read bonuses for notes they participate in
-- (so they can see the bonus history for their own note).
create policy "note_bonuses admin all" on public.note_bonuses
  for all using (public.is_admin()) with check (public.is_admin());

create policy "note_bonuses read for participants" on public.note_bonuses
  for select to authenticated using (
    exists (
      select 1 from public.participations p
      where p.note_id = note_bonuses.note_id
        and p.user_id = auth.uid()
    )
  );

-- Admins manage payouts; lenders read only their own.
create policy "participation_bonus_payouts admin all"
  on public.participation_bonus_payouts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "participation_bonus_payouts read own"
  on public.participation_bonus_payouts
  for select to authenticated using (
    exists (
      select 1 from public.participations p
      where p.id = participation_bonus_payouts.participation_id
        and p.user_id = auth.uid()
    )
  );
