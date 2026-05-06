-- Phase 3 — full Firestore→Postgres domain schema with FKs and RLS.
-- Builds on top of profiles (created in 20260505000000_profiles.sql).
--
-- Naming: snake_case throughout. Money values stored as numeric(14,2).
-- Status fields with closed value sets use enums; open/evolving sets use text.

-- ============================================================================
-- enums
-- ============================================================================

create type public.request_status as enum ('pending', 'approved', 'rejected');
create type public.funding_type as enum ('wire', 'check', 'ach', 'other');
create type public.referral_status as enum ('pending', 'signed_up', 'invested', 'qualified');
create type public.audit_status as enum ('success', 'failure', 'warning');

-- ============================================================================
-- profiles — extend with the user-detail fields we deferred from Phase 2
-- ============================================================================

alter table public.profiles
  add column name text,
  add column phone text,
  add column address_street text,
  add column address_city text,
  add column address_state text,
  add column address_zip text,
  add column entity_type text,
  add column loan_agreement_title text;

-- ============================================================================
-- borrowers — businesses receiving loans
-- ============================================================================

create table public.borrowers (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  address text,
  city text,
  state text,
  zip_code text,
  tax_id text,
  business_type text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- notes — loan offerings
-- ============================================================================

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  -- human-readable identifier (e.g. "K24002")
  note_id text not null unique,
  borrower_id uuid references public.borrowers(id) on delete restrict,
  title text not null,
  principal numeric(14,2) not null,
  rate numeric(7,4) not null,
  term_months integer not null check (term_months > 0),
  term_years integer,
  project_type text not null,
  loan_payment_status text not null default 'Current',
  contract_date date,
  payment_start_date date,
  maturity_date date,
  funding_start_date date,
  funding_end_date date,
  funding_window_end date,
  first_payment_date date,
  monthly_payment numeric(14,2),
  status text not null default 'Active',
  client_status text not null default 'Available',
  type text not null,
  interest_type text not null default 'Amortized',
  description text,
  admin_notes text,
  target_raise numeric(14,2),
  min_investment numeric(14,2),
  locked_sections jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_borrower_id_idx on public.notes(borrower_id);
create index notes_status_idx on public.notes(status);

-- ============================================================================
-- note_registrations — lender applications, before admin approval
-- ============================================================================

create table public.note_registrations (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text not null,
  entity_type text not null,
  name_for_agreement text not null,
  mailing_address text,
  city text,
  state text,
  zip_code text,
  investment_amount numeric(14,2) not null,
  bank_name text not null,
  bank_account_type text not null,
  bank_account_number text not null,
  bank_routing_number text not null,
  bank_account_address text,
  acknowledge_lender boolean not null default false,
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index note_registrations_note_id_idx on public.note_registrations(note_id);
create index note_registrations_user_id_idx on public.note_registrations(user_id);
create index note_registrations_status_idx on public.note_registrations(status);

-- ============================================================================
-- participations — approved investments (the funding-status sub-object is
-- flattened into columns for queryability)
-- ============================================================================

create table public.participations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  note_id uuid not null references public.notes(id) on delete restrict,
  invested_amount numeric(14,2) not null,
  status text not null default 'Active',
  user_notes text,
  -- funding status (formerly nested object)
  funding_received boolean not null default false,
  funding_deposited boolean not null default false,
  funding_cleared boolean not null default false,
  funding_type public.funding_type,
  funding_investment_amount numeric(14,2),
  funding_check_number text,
  funding_wire_reference_number text,
  funding_check_image_url text,
  funding_received_date date,
  funding_deposited_date date,
  funding_cleared_date date,
  funding_notes text,
  funding_other_type_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index participations_user_id_idx on public.participations(user_id);
create index participations_note_id_idx on public.participations(note_id);

-- ============================================================================
-- payments — payment schedule rows for a participation
-- ============================================================================

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references public.participations(id) on delete cascade,
  payment_date date not null,
  principal_amount numeric(14,2) not null,
  interest_amount numeric(14,2) not null,
  status text not null default 'Scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_participation_id_idx on public.payments(participation_id);

-- ============================================================================
-- beneficiaries — estate planning per lender
-- ============================================================================

create table public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  relation text not null,
  percentage integer not null check (percentage between 0 and 100),
  type text not null default 'Primary',
  dob date,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index beneficiaries_user_id_idx on public.beneficiaries(user_id);

-- ============================================================================
-- documents — KYC docs attached to a user
-- ============================================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  file_name text not null,
  file_url text not null,
  status text not null default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_user_id_idx on public.documents(user_id);

-- ============================================================================
-- participation_documents — docs attached to a specific investment
-- ============================================================================

create table public.participation_documents (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references public.participations(id) on delete cascade,
  type text not null,
  file_name text not null,
  file_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index participation_documents_participation_id_idx
  on public.participation_documents(participation_id);

-- ============================================================================
-- activities — activity feed
-- ============================================================================

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  participation_id uuid references public.participations(id) on delete set null,
  note_id uuid references public.notes(id) on delete set null,
  type text not null,
  description text not null,
  amount numeric(14,2) not null,
  activity_date timestamptz not null,
  created_at timestamptz not null default now()
);

create index activities_user_id_idx on public.activities(user_id);
create index activities_activity_date_idx on public.activities(activity_date desc);

-- ============================================================================
-- access_requests — public "Request Access" form submissions
-- ============================================================================

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  is_tcc_member boolean not null default false,
  message text,
  referral_code text,
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index access_requests_status_idx on public.access_requests(status);

-- ============================================================================
-- audit_logs — compliance trail. Server-side writes only (service-role).
-- ============================================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource text,
  resource_id text,
  changes jsonb,
  ip_address text,
  user_agent text,
  status public.audit_status not null default 'success',
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_user_id_idx on public.audit_logs(user_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);

-- ============================================================================
-- referrals
-- ============================================================================

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index referral_codes_user_id_idx on public.referral_codes(user_id);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete set null,
  referred_email text,
  referred_name text,
  referral_code text not null,
  status public.referral_status not null default 'pending',
  signup_date timestamptz,
  first_investment_date timestamptz,
  first_investment_amount numeric(14,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index referrals_referrer_id_idx on public.referrals(referrer_id);
create index referrals_referred_user_id_idx on public.referrals(referred_user_id);

-- referral_stats — derived view, recomputed live (was a sync'd Firestore doc).
-- security_invoker so the view runs with the caller's RLS, not the creator's.
create view public.referral_stats with (security_invoker = true) as
select
  referrer_id as user_id,
  count(*)::int as total_referrals,
  count(*) filter (where status = 'pending')::int as pending_referrals,
  count(*) filter (where status = 'signed_up')::int as signed_up_referrals,
  count(*) filter (where status = 'invested')::int as invested_referrals,
  count(*) filter (where status = 'qualified')::int as qualified_referrals,
  coalesce(sum(first_investment_amount), 0)::numeric(14,2) as total_investment_volume
from public.referrals
group by referrer_id;

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create trigger borrowers_set_updated_at before update on public.borrowers
  for each row execute function public.set_updated_at();
create trigger notes_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();
create trigger note_registrations_set_updated_at before update on public.note_registrations
  for each row execute function public.set_updated_at();
create trigger participations_set_updated_at before update on public.participations
  for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger beneficiaries_set_updated_at before update on public.beneficiaries
  for each row execute function public.set_updated_at();
create trigger documents_set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();
create trigger participation_documents_set_updated_at before update on public.participation_documents
  for each row execute function public.set_updated_at();
create trigger access_requests_set_updated_at before update on public.access_requests
  for each row execute function public.set_updated_at();
create trigger referral_codes_set_updated_at before update on public.referral_codes
  for each row execute function public.set_updated_at();
create trigger referrals_set_updated_at before update on public.referrals
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
--
-- Pattern: enable RLS on every table; lenders see their own rows; admins see
-- everything (via public.is_admin() defined in the profiles migration).
-- Catalog tables (borrowers, notes) are readable by any authenticated user;
-- writes are admin-only. audit_logs is server-side-only writes (no insert
-- policy — only the service-role client can insert, which bypasses RLS).
-- access_requests accepts inserts from unauthenticated visitors.
-- ============================================================================

alter table public.borrowers enable row level security;
alter table public.notes enable row level security;
alter table public.note_registrations enable row level security;
alter table public.participations enable row level security;
alter table public.payments enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.documents enable row level security;
alter table public.participation_documents enable row level security;
alter table public.activities enable row level security;
alter table public.access_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;

-- borrowers: readable by any authenticated user; writes admin-only
create policy "borrowers read auth" on public.borrowers
  for select to authenticated using (true);
create policy "borrowers write admin" on public.borrowers
  for all using (public.is_admin()) with check (public.is_admin());

-- notes: readable by any authenticated user; writes admin-only
create policy "notes read auth" on public.notes
  for select to authenticated using (true);
create policy "notes write admin" on public.notes
  for all using (public.is_admin()) with check (public.is_admin());

-- note_registrations: lenders can read+insert own; admin can do everything
create policy "note_registrations read own" on public.note_registrations
  for select using (auth.uid() = user_id);
create policy "note_registrations insert own" on public.note_registrations
  for insert with check (auth.uid() = user_id);
create policy "note_registrations admin all" on public.note_registrations
  for all using (public.is_admin()) with check (public.is_admin());

-- participations: lenders read own; admin all (admin promotes registration → participation)
create policy "participations read own" on public.participations
  for select using (auth.uid() = user_id);
create policy "participations admin all" on public.participations
  for all using (public.is_admin()) with check (public.is_admin());

-- payments: lender reads payments for their own participations (via FK); admin all
create policy "payments read own" on public.payments
  for select using (
    exists (
      select 1 from public.participations p
      where p.id = payments.participation_id and p.user_id = auth.uid()
    )
  );
create policy "payments admin all" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- beneficiaries: lender owns; admin all
create policy "beneficiaries own" on public.beneficiaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "beneficiaries admin all" on public.beneficiaries
  for all using (public.is_admin()) with check (public.is_admin());

-- documents: lender owns; admin all (admin reviews status)
create policy "documents own" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "documents admin all" on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

-- participation_documents: lender reads docs for own participations; admin all
create policy "participation_documents read own" on public.participation_documents
  for select using (
    exists (
      select 1 from public.participations p
      where p.id = participation_documents.participation_id and p.user_id = auth.uid()
    )
  );
create policy "participation_documents admin all" on public.participation_documents
  for all using (public.is_admin()) with check (public.is_admin());

-- activities: lender reads own; admin all (writes are server-side via service role)
create policy "activities read own" on public.activities
  for select using (auth.uid() = user_id);
create policy "activities admin all" on public.activities
  for all using (public.is_admin()) with check (public.is_admin());

-- access_requests: anyone (incl. anonymous) can submit; only admin reads/manages
create policy "access_requests insert any" on public.access_requests
  for insert with check (true);
create policy "access_requests admin read" on public.access_requests
  for select using (public.is_admin());
create policy "access_requests admin write" on public.access_requests
  for update using (public.is_admin()) with check (public.is_admin());
create policy "access_requests admin delete" on public.access_requests
  for delete using (public.is_admin());

-- audit_logs: admin reads only; writes are server-side via service role (RLS bypassed)
create policy "audit_logs admin read" on public.audit_logs
  for select using (public.is_admin());

-- referral_codes: lender owns; admin all
create policy "referral_codes own" on public.referral_codes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "referral_codes admin all" on public.referral_codes
  for all using (public.is_admin()) with check (public.is_admin());

-- referrals: lender reads where they're the referrer; admin all
create policy "referrals read own" on public.referrals
  for select using (auth.uid() = referrer_id);
create policy "referrals insert own" on public.referrals
  for insert with check (auth.uid() = referrer_id);
create policy "referrals admin all" on public.referrals
  for all using (public.is_admin()) with check (public.is_admin());
