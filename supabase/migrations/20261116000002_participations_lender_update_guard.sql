-- Lock down the lender UPDATE path on public.participations.
--
-- "participations update own pre-funding" (20260712000002) only required
-- funding_received = false before and after the update, and RLS cannot see
-- which columns changed. Through PostgREST a lender could therefore PATCH any
-- column of their own pending row: set funding_deposited / funding_cleared
-- (and the dates / references) while funding_received stayed false, move the
-- row onto another note (including a private one) or entity, change status,
-- and keep editing invested_amount on a row that now looked cleared. The admin
-- payout code, the monthly payout report and the documents gate all trust
-- funding_cleared.
--
-- 1. A BEFORE UPDATE trigger limits a lender to the columns the lender UI
--    actually edits: invested_amount + submitted_amount (updateMyInvestmentAmount
--    in src/lib/registration/actions.ts) and their private user_notes.
--    updated_at is maintained by participations_set_updated_at. Every other
--    column (funding_*, status, note_id, entity_id, user_id, access_request_id,
--    id, created_at, and any column added later) is admin-managed.
--    Admins (is_admin), participations managers (is_participations_manager)
--    and the service role / SQL editor are not restricted, so the admin
--    funding workflow, invite backfill, login merge and the service-role
--    user_notes action keep working unchanged.
-- 2. The lender policy now also requires funding_deposited = false and
--    funding_cleared = false, so a row that is in any funded stage is never
--    lender-editable.

create or replace function public.protect_participation_admin_columns()
returns trigger
language plpgsql
-- NOT security definer: current_user must be the caller's role, not the owner.
set search_path = public
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin')
     or public.is_admin()
     or public.is_participations_manager() then
    return new;
  end if;

  -- Compare the whole row minus the lender-writable columns, so any column
  -- not explicitly allowed here is protected by default.
  if (to_jsonb(new) - array['invested_amount', 'submitted_amount', 'user_notes', 'updated_at'])
     is distinct from
     (to_jsonb(old) - array['invested_amount', 'submitted_amount', 'user_notes', 'updated_at']) then
    raise exception 'only invested_amount, submitted_amount and user_notes can be changed on your participation'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists participations_protect_admin_columns on public.participations;
create trigger participations_protect_admin_columns
  before update on public.participations
  for each row execute function public.protect_participation_admin_columns();

-- Lenders may only edit their participation while it is fully unfunded.
drop policy if exists "participations update own pre-funding" on public.participations;
create policy "participations update own pre-funding"
  on public.participations for update
  using (
    public.auth_owns_entity(entity_id)
    and funding_received = false
    and funding_deposited = false
    and funding_cleared = false
  )
  with check (
    public.auth_owns_entity(entity_id)
    and funding_received = false
    and funding_deposited = false
    and funding_cleared = false
  );
