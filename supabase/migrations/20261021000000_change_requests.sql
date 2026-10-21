-- Lender change requests (address, W-9, emails, name, loan agreement fields,
-- new entity, other). Lenders submit; admins review, apply and close them.
create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id uuid references public.investor_entities(id) on delete set null,
  type text not null check (type in (
    'mailing_address', 'w9', 'entity_email', 'login_email', 'name',
    'la_title', 'la_entity_type', 'la_business_name', 'add_entity', 'other'
  )),
  details jsonb not null default '{}'::jsonb,
  message text,
  status text not null default 'open'
    check (status in ('open', 'completed', 'declined')),
  admin_note text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists change_requests_status_idx
  on public.change_requests(status, created_at desc);
create index if not exists change_requests_user_idx
  on public.change_requests(user_id);

create trigger change_requests_set_updated_at before update
  on public.change_requests
  for each row execute function public.set_updated_at();

alter table public.change_requests enable row level security;

-- Lenders see their own requests and can submit new ones (open only, and only
-- for an entity they own when one is given). They can't edit or resolve them.
create policy "change_requests read own"
  on public.change_requests for select
  using (user_id = auth.uid());

create policy "change_requests insert own"
  on public.change_requests for insert
  with check (
    user_id = auth.uid()
    and status = 'open'
    and (entity_id is null or public.auth_owns_entity(entity_id))
  );

create policy "change_requests admin all"
  on public.change_requests for all
  using (public.is_admin())
  with check (public.is_admin());
