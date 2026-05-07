-- Track payments from borrower → note → lenders.
--
-- Same shape as note_bonuses: admin records the borrower's payment at the
-- note level (principal + interest split) and we snapshot a pro-rata
-- payout per funded participation at insertion time. Edits aren't
-- supported — fix typos by deleting and re-adding.
--
-- The original `payments` table (per-participation, schedule-style) was
-- never wired up in code or populated. Drop it so we don't carry two
-- competing payment models.

drop table if exists public.payments;

create table public.note_payments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  payment_date date not null,
  principal_amount numeric(14,2) not null default 0 check (principal_amount >= 0),
  interest_amount numeric(14,2) not null default 0 check (interest_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint note_payments_amount_positive
    check (principal_amount + interest_amount > 0)
);

create index note_payments_note_id_idx on public.note_payments(note_id);
create index note_payments_payment_date_idx on public.note_payments(payment_date desc);

create table public.participation_payment_payouts (
  id uuid primary key default gen_random_uuid(),
  note_payment_id uuid not null references public.note_payments(id) on delete cascade,
  participation_id uuid not null references public.participations(id) on delete cascade,
  principal_amount numeric(14,2) not null default 0 check (principal_amount >= 0),
  interest_amount numeric(14,2) not null default 0 check (interest_amount >= 0),
  share_basis numeric(14,2) not null,
  created_at timestamptz not null default now(),
  unique (note_payment_id, participation_id)
);

create index participation_payment_payouts_participation_id_idx
  on public.participation_payment_payouts(participation_id);
create index participation_payment_payouts_note_payment_id_idx
  on public.participation_payment_payouts(note_payment_id);

alter table public.note_payments enable row level security;
alter table public.participation_payment_payouts enable row level security;

create policy "note_payments admin all" on public.note_payments
  for all using (public.is_admin()) with check (public.is_admin());

create policy "note_payments read for participants" on public.note_payments
  for select to authenticated using (
    exists (
      select 1 from public.participations p
      where p.note_id = note_payments.note_id
        and p.user_id = auth.uid()
    )
  );

create policy "participation_payment_payouts admin all"
  on public.participation_payment_payouts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "participation_payment_payouts read own"
  on public.participation_payment_payouts
  for select to authenticated using (
    exists (
      select 1 from public.participations p
      where p.id = participation_payment_payouts.participation_id
        and p.user_id = auth.uid()
    )
  );
