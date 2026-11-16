-- PREVIEW (read-only). Lenders who were paid from the start but whose first
-- payouts were never recorded in the portal:
--   * Erik Westerberg (personal) K25002 $20,000 — payouts #1-13 missing
--     (2025 vendor list shows $1,064.27 interest for #1-7).
--   * Mitch Broussard (personal) K25004 $10,000 — payouts #1-7 missing
--     (2025 vendor list shows $79.16 for #1, Dec 2025).
-- Amounts only: two positions of the same size on the same note have the same
-- schedule, so each missing payout's principal/interest is read from another
-- lender's same-size position (their later payouts already match Erik's and
-- Mitch's to the cent). New rows are created for Erik and Mitch; the reference
-- positions are NOT changed, and nothing transfers from those lenders.
--   Erik's amounts  : same as Brent White's K25002 $20,000 (ad108996-847b-4a00-9560-57fce8b5711b)
--   Mitch's amounts : same as Alison Betsinger's K25004 $10,000 (23e66b97-9882-436b-b71d-689162dbc374)
-- Run this first; then run 2026-11-16-missing-first-payouts-apply.sql.

with plan(target_id, template_id, max_number) as (
  values
    ('3a17e88a-4415-44b0-a227-a05a5f1383b0'::uuid, 'ad108996-847b-4a00-9560-57fce8b5711b'::uuid, 13),
    ('bec8592f-5718-44f6-ac79-80d195de377d'::uuid, '23e66b97-9882-436b-b71d-689162dbc374'::uuid, 7)
)
select
  case when plan.target_id = '3a17e88a-4415-44b0-a227-a05a5f1383b0' then 'Erik Westerberg K25002' else 'Mitch Broussard K25004' end as position,
  np.payment_number,
  np.payment_date,
  t.principal_amount,
  t.interest_amount,
  exists (
    select 1 from public.participation_payment_payouts x
    where x.note_payment_id = t.note_payment_id and x.participation_id = plan.target_id
  ) as already_recorded
from plan
join public.participation_payment_payouts t on t.participation_id = plan.template_id
join public.note_payments np on np.id = t.note_payment_id
where np.payment_number <= plan.max_number
order by position, np.payment_number;
