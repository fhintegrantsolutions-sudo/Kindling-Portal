-- The entity identity now lives on investor_entities, and every reader/writer in
-- the app has been repointed (verified by a grep gate over src/). Drop the
-- now-unused flat columns from profiles.
alter table public.profiles
  drop column if exists entity_type,
  drop column if exists business_name,
  drop column if exists loan_agreement_title,
  drop column if exists address_street,
  drop column if exists address_city,
  drop column if exists address_state,
  drop column if exists address_zip;
