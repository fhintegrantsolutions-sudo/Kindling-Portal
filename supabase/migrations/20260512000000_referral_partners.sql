-- External referral partners: people who refer leads but don't have a portal
-- account. Kept separate from `profiles` so we never accidentally show them
-- in the Users list or try to send them an invite. `converted_user_id` is
-- backfilled if/when a partner is promoted to a full lender — the row stays
-- as a historical record so old links keep tracing back to a known partner.

create table public.referral_partners (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  email text unique,
  phone text,
  referral_code text not null unique,
  notes text,
  converted_user_id uuid references auth.users(id) on delete set null,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index referral_partners_referral_code_idx
  on public.referral_partners(referral_code);
create index referral_partners_converted_user_id_idx
  on public.referral_partners(converted_user_id)
  where converted_user_id is not null;

create trigger referral_partners_set_updated_at before update on public.referral_partners
  for each row execute function public.set_updated_at();

alter table public.referral_partners enable row level security;

-- Admin-only: external partners are never visible to lenders or anon users.
create policy "referral_partners admin all" on public.referral_partners
  for all using (public.is_admin()) with check (public.is_admin());
