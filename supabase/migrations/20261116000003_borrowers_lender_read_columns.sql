-- Stop exposing borrower PII to every signed-in user.
--
-- "borrowers read auth" (20260505000001) let ANY authenticated login read
-- every column of every borrower over PostgREST — tax_id, email, phone,
-- address, contact names and the internal admin notes — even though the
-- lender UI only ever shows the borrower's business_name.
--
-- Admins and lenders share the same `authenticated` database role, so a
-- column-level REVOKE would also break the admin borrower pages. Instead:
--
--   * Drop the blanket row policy. Full-row access is unchanged for the
--     roles that already had their own policy:
--       - admin:                "borrowers write admin" (FOR ALL, is_admin())
--       - participations_admin: "borrowers select for participations_admin"
--   * Lender-facing pages read the business name through borrower_names,
--     which exposes only (id, business_name). PostgREST infers the
--     notes.borrower_id -> borrower_names.id relationship from the
--     underlying foreign key, so notes can embed it as before.

drop policy if exists "borrowers read auth" on public.borrowers;

-- Runs with the view owner's rights (security_invoker = false) so lenders,
-- who no longer pass any RLS policy on public.borrowers, can still resolve
-- a borrower's business name. Only these two columns are ever exposed.
create or replace view public.borrower_names
with (security_invoker = false) as
select id, business_name
from public.borrowers;

comment on view public.borrower_names is
  'Lender-safe projection of borrowers (id, business_name only). Full borrower rows are admin/participations_admin only.';

-- Read-only, signed-in users only. The view is auto-updatable and runs with
-- the owner's rights, so every write privilege must stay revoked, and anon
-- (which never had a read policy on borrowers) gets nothing.
revoke all on public.borrower_names from public, anon, authenticated;
grant select on public.borrower_names to authenticated;

notify pgrst, 'reload schema';
