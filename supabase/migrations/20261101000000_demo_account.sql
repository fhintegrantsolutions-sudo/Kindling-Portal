-- Demo account: a login that VIEWS another lender's portal (read-only).
--
-- profiles.demo_of points a demo login at the lender it mirrors. Nothing is
-- copied, so admin totals, the payment ledger and payouts are unaffected.
--
-- Only SELECT policies are added below, each gated on demo_target(). The demo
-- login owns no investor entities, so every existing insert/update/delete
-- policy (auth_owns_entity / auth.uid()) still rejects its writes. The app
-- additionally blocks demo writes in server actions that use the service role
-- and masks the mirrored lender's personal details before rendering.

alter table public.profiles
  add column if not exists demo_of uuid references public.profiles(id) on delete set null;

-- Only an admin (or the service role / SQL editor) may set or change demo_of,
-- otherwise a lender could point their own profile at someone else's data.
create or replace function public.protect_profile_demo_of()
returns trigger
language plpgsql
-- NOT security definer: current_user must be the caller's role, not the owner.
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' and new.demo_of is not null)
     or (tg_op = 'UPDATE' and new.demo_of is distinct from old.demo_of) then
    if current_user not in ('postgres', 'service_role', 'supabase_admin')
       and not public.is_admin() then
      raise exception 'demo_of can only be set by an admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_demo_of on public.profiles;
create trigger profiles_protect_demo_of
  before insert or update on public.profiles
  for each row execute function public.protect_profile_demo_of();

-- The lender the current login mirrors, or null for every normal login.
create or replace function public.demo_target()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select demo_of from public.profiles where id = auth.uid();
$$;

-- True when the current login is a demo of the lender who owns this entity.
create or replace function public.demo_reads_entity(p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.investor_entities e
    where e.id = p_entity_id
      and e.owner_user_id = public.demo_target()
  );
$$;

grant execute on function public.demo_target() to authenticated;
grant execute on function public.demo_reads_entity(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Read-only policies for demo logins (permissive; OR'd with the existing ones)
-- ---------------------------------------------------------------------------

drop policy if exists "investor_entities demo read" on public.investor_entities;
create policy "investor_entities demo read" on public.investor_entities
  for select to authenticated
  using (owner_user_id = public.demo_target());

drop policy if exists "participations demo read" on public.participations;
create policy "participations demo read" on public.participations
  for select to authenticated
  using (public.demo_reads_entity(entity_id));

drop policy if exists "note_registrations demo read" on public.note_registrations;
create policy "note_registrations demo read" on public.note_registrations
  for select to authenticated
  using (public.demo_reads_entity(entity_id));

drop policy if exists "beneficiaries demo read" on public.beneficiaries;
create policy "beneficiaries demo read" on public.beneficiaries
  for select to authenticated
  using (public.demo_reads_entity(entity_id));

drop policy if exists "documents demo read" on public.documents;
create policy "documents demo read" on public.documents
  for select to authenticated
  using (public.demo_reads_entity(entity_id));

drop policy if exists "note_visibility demo read" on public.note_visibility;
create policy "note_visibility demo read" on public.note_visibility
  for select to authenticated
  using (public.demo_reads_entity(entity_id));

drop policy if exists "note_interests demo read" on public.note_interests;
create policy "note_interests demo read" on public.note_interests
  for select to authenticated
  using (public.demo_reads_entity(entity_id));

drop policy if exists "notes demo read private" on public.notes;
create policy "notes demo read private" on public.notes
  for select to authenticated
  using (
    exists (
      select 1 from public.note_visibility nv
      where nv.note_id = notes.id
        and public.demo_reads_entity(nv.entity_id)
    )
  );

drop policy if exists "participation_documents demo read" on public.participation_documents;
create policy "participation_documents demo read" on public.participation_documents
  for select to authenticated
  using (
    exists (
      select 1 from public.participations p
      where p.id = participation_documents.participation_id
        and public.demo_reads_entity(p.entity_id)
    )
  );

drop policy if exists "note_bonuses demo read" on public.note_bonuses;
create policy "note_bonuses demo read" on public.note_bonuses
  for select to authenticated
  using (
    exists (
      select 1 from public.participations p
      where p.note_id = note_bonuses.note_id
        and public.demo_reads_entity(p.entity_id)
    )
  );

drop policy if exists "participation_bonus_payouts demo read" on public.participation_bonus_payouts;
create policy "participation_bonus_payouts demo read" on public.participation_bonus_payouts
  for select to authenticated
  using (
    exists (
      select 1 from public.participations p
      where p.id = participation_bonus_payouts.participation_id
        and public.demo_reads_entity(p.entity_id)
    )
  );

drop policy if exists "note_payments demo read" on public.note_payments;
create policy "note_payments demo read" on public.note_payments
  for select to authenticated
  using (
    exists (
      select 1 from public.participations p
      where p.note_id = note_payments.note_id
        and public.demo_reads_entity(p.entity_id)
    )
  );

drop policy if exists "participation_payment_payouts demo read" on public.participation_payment_payouts;
create policy "participation_payment_payouts demo read" on public.participation_payment_payouts
  for select to authenticated
  using (
    exists (
      select 1 from public.participations p
      where p.id = participation_payment_payouts.participation_id
        and public.demo_reads_entity(p.entity_id)
    )
  );
