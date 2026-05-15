-- Business name on external referral partners — optional, for partners who
-- refer in the name of an entity (e.g. an advisory firm or RIA) rather than
-- as an individual.

alter table public.referral_partners
  add column business_name text;
