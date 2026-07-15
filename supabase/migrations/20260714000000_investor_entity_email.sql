-- Per-entity contact email.
--
-- Until now an entity's email was IMPLICIT — it was whatever the owning login's
-- email happened to be. That breaks the moment logins are merged: once Felipe's
-- IRA entity is re-parented to his surviving login, nothing records that the IRA
-- corresponded via fandfsdira@yahoo.com.
--
-- So stamp the owner's email onto each entity NOW, while that association still
-- exists. THIS MIGRATION MUST RUN BEFORE ANY LOGIN MERGE.

alter table public.investor_entities
  add column if not exists email text;

-- Backfill: each entity inherits its current owner's login email.
update public.investor_entities e
  set email = p.email
  from public.profiles p
  where p.id = e.owner_user_id
    and e.email is null;

comment on column public.investor_entities.email is
  'Contact email for this entity. Seeded from the owning login at creation, but '
  'independent of it — after a merge the entity keeps the address it actually '
  'corresponded under, even though that login can no longer sign in.';
