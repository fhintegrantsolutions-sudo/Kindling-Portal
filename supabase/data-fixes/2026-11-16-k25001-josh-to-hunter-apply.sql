-- APPLY. K25001 transfer: Joshua Harmsworth -> Hunter Purvis, effective
-- payment #10. Run the preview (2026-11-16-k25001-josh-to-hunter.sql) first.
--   * creates Hunter's K25001 position: same $135,000 schedule basis,
--     payments #10-60, funded by the transfer (starting balance $119,055.75);
--   * moves Josh's recorded payouts #10 onward to Hunter (amounts unchanged);
--   * closes Josh's position after #9 (status 'Transferred').
-- Stops with an error, changing nothing, if Hunter's login or entity is
-- missing or the transfer was already applied.
begin;

do $$
declare
  josh_part   constant uuid := 'b5441cdc-7191-4d75-b200-ef98cc64e24d';
  hunter_user uuid;
  hunter_ent  uuid;
  hunter_part uuid;
  moved       int;
begin
  select id into hunter_user from public.profiles
  where lower(email) = 'h.gagepurvis@gmail.com';
  if hunter_user is null then
    raise exception 'Hunter Purvis (h.gagepurvis@gmail.com) not found: create him in Admin -> Users first';
  end if;

  select id into hunter_ent from public.investor_entities
  where owner_user_id = hunter_user
  order by is_primary desc, created_at
  limit 1;
  if hunter_ent is null then
    raise exception 'Hunter Purvis has no entity: add one in Admin -> Users -> Entities first';
  end if;

  if exists (select 1 from public.participations
             where id = josh_part and last_payment_number is not null) then
    raise exception 'Already applied: Josh''s K25001 position is already closed';
  end if;

  insert into public.participations (
    user_id, entity_id, note_id, invested_amount, status,
    funding_received, funding_deposited, funding_cleared,
    funding_type, funding_investment_amount, funding_other_type_description,
    funding_received_date, funding_cleared_date,
    first_payment_number
  )
  select hunter_user, hunter_ent, pa.note_id, pa.invested_amount, 'Active',
         true, false, true,
         'other', 119055.75,
         'Transfer from Joshua Harmsworth, effective payment #10 (amendment dated 2026-03-15)',
         date '2026-03-15', date '2026-03-15',
         10
  from public.participations pa
  where pa.id = josh_part
  returning id into hunter_part;

  update public.participation_payment_payouts pp
  set participation_id = hunter_part
  from public.note_payments np
  where np.id = pp.note_payment_id
    and pp.participation_id = josh_part
    and np.payment_number >= 10;
  get diagnostics moved = row_count;

  update public.participations
  set last_payment_number = 9, status = 'Transferred'
  where id = josh_part;

  raise notice 'Hunter position %, moved % payouts', hunter_part, moved;
end $$;

commit;
