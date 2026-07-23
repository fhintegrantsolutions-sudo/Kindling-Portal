-- Per-lender note documents (loan agreements).
--
-- The participation_documents table already exists (domain schema) with a
-- lender "read own" SELECT policy. This migration:
--   1. creates the PRIVATE storage bucket that holds the files,
--   2. tightens the lender read policy to require cleared funding,
--   3. adds an admin manage-all policy,
--   4. adds audit columns.
--
-- All storage access goes through the service-role client (upload/delete) and
-- short-lived signed URLs minted server-side after an ownership + cleared
-- re-check, so the bucket stays private and needs no per-lender storage.objects
-- policies (service-role bypasses RLS; authenticated/anon get default-deny).

-- ---------------------------------------------------------------------------
-- 1. Private bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('participation-documents', 'participation-documents', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Audit columns (table is empty, so no backfill needed)
-- ---------------------------------------------------------------------------
alter table public.participation_documents
  add column if not exists uploaded_by uuid references public.profiles(id),
  add column if not exists size_bytes bigint;

-- file_url holds the storage OBJECT PATH (e.g. "{participation_id}/{uuid}.pdf"),
-- not a public URL — downloads are served via signed URLs.
comment on column public.participation_documents.file_url is
  'Storage object path in the private participation-documents bucket (not a public URL).';

-- ---------------------------------------------------------------------------
-- 3. RLS: lender may read a document only for a participation they own AND
--    whose funding has cleared. Admin manages all.
-- ---------------------------------------------------------------------------
alter table public.participation_documents enable row level security;

drop policy if exists "participation_documents read own" on public.participation_documents;
create policy "participation_documents read own"
  on public.participation_documents for select
  to authenticated
  using (
    exists (
      select 1
      from public.participations p
      join public.investor_entities e on e.id = p.entity_id
      where p.id = participation_documents.participation_id
        and e.owner_user_id = auth.uid()
        and p.funding_cleared = true
    )
  );

drop policy if exists "participation_documents admin all" on public.participation_documents;
create policy "participation_documents admin all"
  on public.participation_documents for all
  using (is_admin())
  with check (is_admin());
