-- Entity-ownership RLS.
--
-- One login (auth.users) may own N investor entities. Lender-facing row access
-- moves from `auth.uid() = user_id` to "I own the entity that owns this row".
-- Admin policies (is_admin() / is_participations_manager()) are untouched, and
-- the token-gated anon INSERT paths for the public lead/setup flow are preserved
-- verbatim (those rows have no entity yet).

-- ---------------------------------------------------------------------------
-- Ownership helper
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- investor_entities: lenders read their own; admins manage.
-- (No lender insert/update/delete — entities are admin-managed.)
-- ---------------------------------------------------------------------------
drop policy if exists "investor_entities read own" on public.investor_entities;
create policy "investor_entities read own"
  on public.investor_entities for select
  using (owner_user_id = auth.uid());

drop policy if exists "investor_entities admin all" on public.investor_entities;
create policy "investor_entities admin all"
  on public.investor_entities for all
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------------
-- participations
-- ---------------------------------------------------------------------------
drop policy if exists "participations read own" on public.participations;
create policy "participations read own"
  on public.participations for select
  using (public.auth_owns_entity(entity_id));

drop policy if exists "participations insert own" on public.participations;
create policy "participations insert own"
  on public.participations for insert
  with check (public.auth_owns_entity(entity_id));

-- Lenders may only edit their participation before funding is received.
drop policy if exists "participations update own pre-funding" on public.participations;
create policy "participations update own pre-funding"
  on public.participations for update
  using (public.auth_owns_entity(entity_id) and funding_received = false)
  with check (public.auth_owns_entity(entity_id) and funding_received = false);

-- ---------------------------------------------------------------------------
-- note_registrations
-- ---------------------------------------------------------------------------
drop policy if exists "note_registrations read own" on public.note_registrations;
create policy "note_registrations read own"
  on public.note_registrations for select
  using (public.auth_owns_entity(entity_id));

-- Keeps the anon setup-token branch exactly as it was.
drop policy if exists "note_registrations insert own or via setup token" on public.note_registrations;
create policy "note_registrations insert own or via setup token"
  on public.note_registrations for insert
  with check (
    public.auth_owns_entity(entity_id)
    or (
      user_id is null
      and access_request_id is not null
      and exists (
        select 1 from public.access_requests ar
        where ar.id = note_registrations.access_request_id
          and ar.status = 'approved'::request_status
          and ar.setup_token is not null
          and (ar.setup_token_expires_at is null or ar.setup_token_expires_at > now())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- beneficiaries
-- ---------------------------------------------------------------------------
drop policy if exists "beneficiaries own" on public.beneficiaries;
create policy "beneficiaries own"
  on public.beneficiaries for all
  using (public.auth_owns_entity(entity_id))
  with check (public.auth_owns_entity(entity_id));

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
drop policy if exists "documents own" on public.documents;
create policy "documents own"
  on public.documents for all
  using (public.auth_owns_entity(entity_id))
  with check (public.auth_owns_entity(entity_id));

-- ---------------------------------------------------------------------------
-- note_visibility
-- ---------------------------------------------------------------------------
drop policy if exists "note_visibility read own" on public.note_visibility;
create policy "note_visibility read own"
  on public.note_visibility for select
  using (public.auth_owns_entity(entity_id));

-- ---------------------------------------------------------------------------
-- notes: private-note gate
-- ---------------------------------------------------------------------------
drop policy if exists "notes read visible" on public.notes;
create policy "notes read visible"
  on public.notes for select
  to authenticated
  using (
    not is_private
    or is_admin()
    or exists (
      select 1
      from public.note_visibility nv
      join public.investor_entities e on e.id = nv.entity_id
      where nv.note_id = notes.id and e.owner_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.participations p
      join public.investor_entities e on e.id = p.entity_id
      where p.note_id = notes.id and e.owner_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Note-level children readable by participants (via entity)
-- ---------------------------------------------------------------------------
drop policy if exists "note_bonuses read for participants" on public.note_bonuses;
create policy "note_bonuses read for participants"
  on public.note_bonuses for select
  to authenticated
  using (
    exists (
      select 1
      from public.participations p
      join public.investor_entities e on e.id = p.entity_id
      where p.note_id = note_bonuses.note_id and e.owner_user_id = auth.uid()
    )
  );

drop policy if exists "note_payments read for participants" on public.note_payments;
create policy "note_payments read for participants"
  on public.note_payments for select
  to authenticated
  using (
    exists (
      select 1
      from public.participations p
      join public.investor_entities e on e.id = p.entity_id
      where p.note_id = note_payments.note_id and e.owner_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Participation-level children (payouts, documents)
-- ---------------------------------------------------------------------------
drop policy if exists "participation_bonus_payouts read own" on public.participation_bonus_payouts;
create policy "participation_bonus_payouts read own"
  on public.participation_bonus_payouts for select
  to authenticated
  using (
    exists (
      select 1
      from public.participations p
      join public.investor_entities e on e.id = p.entity_id
      where p.id = participation_bonus_payouts.participation_id
        and e.owner_user_id = auth.uid()
    )
  );

drop policy if exists "participation_payment_payouts read own" on public.participation_payment_payouts;
create policy "participation_payment_payouts read own"
  on public.participation_payment_payouts for select
  to authenticated
  using (
    exists (
      select 1
      from public.participations p
      join public.investor_entities e on e.id = p.entity_id
      where p.id = participation_payment_payouts.participation_id
        and e.owner_user_id = auth.uid()
    )
  );

drop policy if exists "participation_documents read own" on public.participation_documents;
create policy "participation_documents read own"
  on public.participation_documents for select
  using (
    exists (
      select 1
      from public.participations p
      join public.investor_entities e on e.id = p.entity_id
      where p.id = participation_documents.participation_id
        and e.owner_user_id = auth.uid()
    )
  );

grant execute on function public.auth_owns_entity(uuid) to authenticated, anon;
