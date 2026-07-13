-- One entity per existing profile, carrying its current flat identity fields.
-- display_name: business_name if present, else "Personal" for Individual/unknown,
-- else the entity_type label.
insert into public.investor_entities
  (owner_user_id, display_name, entity_type, business_name, loan_agreement_title,
   address_street, address_city, address_state, address_zip, is_primary)
select
  p.id,
  coalesce(
    nullif(btrim(p.business_name), ''),
    case
      when p.entity_type is null or p.entity_type = 'Individual' then 'Personal'
      else p.entity_type
    end
  ),
  p.entity_type,
  p.business_name,
  p.loan_agreement_title,
  p.address_street, p.address_city, p.address_state, p.address_zip,
  true
from public.profiles p
where not exists (
  select 1 from public.investor_entities e where e.owner_user_id = p.id
);

-- Backfill entity_id from the owner's (single) primary entity. Rows whose
-- user_id is null (un-converted leads) intentionally keep entity_id null.
update public.participations t
  set entity_id = e.id
  from public.investor_entities e
  where e.owner_user_id = t.user_id and e.is_primary and t.entity_id is null;

update public.note_registrations t
  set entity_id = e.id
  from public.investor_entities e
  where e.owner_user_id = t.user_id and e.is_primary and t.entity_id is null;

update public.beneficiaries t
  set entity_id = e.id
  from public.investor_entities e
  where e.owner_user_id = t.user_id and e.is_primary and t.entity_id is null;

update public.documents t
  set entity_id = e.id
  from public.investor_entities e
  where e.owner_user_id = t.user_id and e.is_primary and t.entity_id is null;

update public.note_visibility t
  set entity_id = e.id
  from public.investor_entities e
  where e.owner_user_id = t.user_id and e.is_primary and t.entity_id is null;
