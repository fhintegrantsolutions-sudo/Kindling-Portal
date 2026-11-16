-- APPLY. Adds the missing first payouts for Erik Westerberg (K25002 #1-13)
-- and Mitch Broussard (K25004 #1-7). Amounts are read from another lender's
-- same-size position on the same note (identical schedule); that position is
-- not changed and nothing transfers from it.
-- Run the preview (2026-11-16-missing-first-payouts.sql) first. Safe to re-run.
begin;

with plan(target_id, template_id, max_number) as (
  values
    ('3a17e88a-4415-44b0-a227-a05a5f1383b0'::uuid, 'ad108996-847b-4a00-9560-57fce8b5711b'::uuid, 13),
    ('bec8592f-5718-44f6-ac79-80d195de377d'::uuid, '23e66b97-9882-436b-b71d-689162dbc374'::uuid, 7)
)
insert into public.participation_payment_payouts
  (note_payment_id, participation_id, principal_amount, interest_amount, share_basis)
select
  t.note_payment_id,
  plan.target_id,
  t.principal_amount,
  t.interest_amount,
  t.share_basis
from plan
join public.participation_payment_payouts t on t.participation_id = plan.template_id
join public.note_payments np on np.id = t.note_payment_id
where np.payment_number <= plan.max_number
on conflict (note_payment_id, participation_id) do nothing;

commit;
