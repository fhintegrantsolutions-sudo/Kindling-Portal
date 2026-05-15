-- Step 2: helper function + RLS policies for the new `participations_admin`
-- role. A participations_admin can read and update participations, and read
-- related tables to render that view, but has no access to the rest of the
-- admin surface — no user management, no notes/borrowers CRUD, no referrals,
-- no auth-user creation. Routes and the sidebar enforce this on the UI;
-- these policies enforce it at the database.

create or replace function public.is_participations_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'participations_admin')
  );
$$;

-- Existing `is_admin()` policies remain (so full admins keep full access);
-- these add an additional permissive layer for the scoped role.
create policy "participations select for participations_admin"
  on public.participations
  for select using (public.is_participations_manager());

create policy "participations update for participations_admin"
  on public.participations
  for update
  using (public.is_participations_manager())
  with check (public.is_participations_manager());

create policy "notes select for participations_admin"
  on public.notes
  for select using (public.is_participations_manager());

create policy "profiles select for participations_admin"
  on public.profiles
  for select using (public.is_participations_manager());

create policy "access_requests select for participations_admin"
  on public.access_requests
  for select using (public.is_participations_manager());

create policy "borrowers select for participations_admin"
  on public.borrowers
  for select using (public.is_participations_manager());
