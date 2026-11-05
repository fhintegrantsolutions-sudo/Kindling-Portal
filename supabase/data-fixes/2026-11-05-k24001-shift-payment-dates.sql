-- PREVIEW (read-only). K24001 started paying in August 2024: its first payment
-- date is 2024-08-22, but the 26 recorded payments still start 2024-09-23.
-- Shows each payment's current date next to the corrected one
-- (2024-08-22 + (payment_number - 1) months). Amounts don't change, and lender
-- payouts link to these payments, so lenders' dates follow automatically.
select
  np.payment_number,
  np.payment_date as current_date,
  (date '2024-08-22' + (np.payment_number - 1) * interval '1 month')::date as new_date,
  np.principal_amount,
  np.interest_amount,
  (select count(*) from public.participation_payment_payouts pp
     where pp.note_payment_id = np.id) as lender_payouts
from public.note_payments np
join public.notes n on n.id = np.note_id
where n.note_id = 'K24001'
order by np.payment_number;
