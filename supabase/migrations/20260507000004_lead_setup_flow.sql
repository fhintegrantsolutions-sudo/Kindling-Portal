-- Insert a "lead fills their own info" step between admin approval and
-- participation creation:
--   1. Public submits /request-access → access_requests pending
--   2. Admin approves with note + amount → access_request status=approved,
--      a one-time setup_token is generated. Admin copies the link from the
--      admin UI and emails it to the lead.
--   3. Lead clicks link → public form at /setup-participation/[token]
--      → fills entity_type, name_for_agreement, mailing address, ack
--      → on submit, a note_registration row + a participation row are
--        created. Access_request flips to converted.
--   4. Funding workflow + invite proceed as before.

alter table public.access_requests
  add column setup_token text unique,
  add column setup_token_expires_at timestamptz,
  add column setup_completed_at timestamptz;

create index access_requests_setup_token_idx
  on public.access_requests(setup_token)
  where setup_token is not null;

-- Allow note_registrations to back-pointer to the originating access_request
-- so the new-lead intake produces a unified audit trail (note_registration +
-- participation, both linked to the access_request).
alter table public.note_registrations
  add column access_request_id uuid references public.access_requests(id) on delete set null;

create index note_registrations_access_request_id_idx
  on public.note_registrations(access_request_id);

-- Public submission of the setup form needs to insert a note_registration
-- row WITHOUT being authenticated (the lead doesn't have an account yet).
-- The existing RLS policy required `auth.uid() = user_id`, which excludes
-- token-validated submissions where user_id is null. Replace it with a
-- policy that allows insert when user_id matches OR a valid (approved,
-- non-expired) access_request_id is provided.

drop policy if exists "note_registrations insert own" on public.note_registrations;

create policy "note_registrations insert own or via setup token"
  on public.note_registrations
  for insert
  with check (
    auth.uid() = user_id
    or (
      user_id is null
      and access_request_id is not null
      and exists (
        select 1 from public.access_requests ar
        where ar.id = access_request_id
          and ar.status = 'approved'
          and ar.setup_token is not null
          and (ar.setup_token_expires_at is null
               or ar.setup_token_expires_at > now())
      )
    )
  );

-- Same shape for participations: the lead's setup-form submission needs to
-- insert a participation row with user_id=null. Today there's no anon-insert
-- policy, so admin-only writes via service_role were the only path. We keep
-- service_role as the canonical writer (the Server Action uses
-- createAdminClient), so no policy change is strictly required — but we add
-- a narrowly-scoped policy in case a future server action wants to insert
-- via the user-context client and the access_request gate.

create policy "participations insert via setup token"
  on public.participations
  for insert
  with check (
    user_id is null
    and access_request_id is not null
    and exists (
      select 1 from public.access_requests ar
      where ar.id = access_request_id
        and ar.status = 'approved'
        and ar.setup_token is not null
        and (ar.setup_token_expires_at is null
             or ar.setup_token_expires_at > now())
    )
  );
