-- Referral partners are just lenders flagged as approved referrers — the
-- badge is metadata, no separate role/access. Lets admin see at a glance
-- which lenders can refer new sign-ups, independent of whether a referral
-- code has been generated for them yet.

alter table public.profiles
  add column is_referral_partner boolean not null default false;

-- Backfill: anyone with an active referral_code is implicitly a partner.
update public.profiles p
set is_referral_partner = true
where exists (
  select 1 from public.referral_codes rc
  where rc.user_id = p.id and rc.is_active = true
);

create index profiles_is_referral_partner_idx
  on public.profiles(is_referral_partner)
  where is_referral_partner = true;
