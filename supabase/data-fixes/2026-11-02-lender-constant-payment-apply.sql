-- APPLY for 2026-11-02-lender-constant-payment.sql. Run the preview first,
-- then run this WHOLE file as-is. Sets each recorded lender payout's interest
-- to the monthly payment minus calculator.net's principal (payment #1 minus
-- the lender's fee share) and commits.

begin;

with lp as (
  select distinct
    pa.id               as pid,
    pa.invested_amount  as inv,
    n.rate / 100.0 / 12 as r,
    n.term_months       as term,
    case when n.principal > 0
          and greatest(coalesce(n.fee, 0), 0) + greatest(coalesce(n.cospark_fee, 0), 0) > 0
      then round((greatest(coalesce(n.fee, 0), 0) + greatest(coalesce(n.cospark_fee, 0), 0))
                 * pa.invested_amount / n.principal, 2)
      else 0 end        as fee_share
  from public.participation_payment_payouts pp
  join public.note_payments np on np.id = pp.note_payment_id
  join public.notes n on n.id = np.note_id
  join public.participations pa on pa.id = pp.participation_id
  where np.payment_number is not null
    and pa.invested_amount > 0
    and n.rate > 0
    and n.term_months > 0
    and n.interest_type <> 'Interest only'
),
params as (
  select *,
    inv * r * power(1 + r, term) / (power(1 + r, term) - 1) as pmt_exact
  from lp
),
rowcalc as (
  select
    pp.id,
    np.payment_number,
    p.fee_share,
    -- + 1e-9 so an exact half-cent (e.g. 19.375) rounds UP like calculator.net;
    -- numeric division truncates the repeating monthly rate just below it.
    round(p.pmt_exact + 0.000000001, 2) as monthly_payment,
    round(p.pmt_exact / power(1 + p.r, p.term - np.payment_number + 1)
      + 0.000000001, 2) as new_principal
  from public.participation_payment_payouts pp
  join public.note_payments np on np.id = pp.note_payment_id
  join params p on p.pid = pp.participation_id
  where np.payment_number between 1 and p.term
),
target as (
  select id, new_principal,
    -- Interest = monthly payment - principal, so every month totals exactly
    -- the monthly payment; payment #1 also loses the lender's fee share.
    (monthly_payment - new_principal)
      - case when payment_number = 1
          then least(fee_share, monthly_payment - new_principal) else 0 end
      as new_interest
  from rowcalc
)
update public.participation_payment_payouts pp
set principal_amount = t.new_principal,
    interest_amount  = t.new_interest
from target t
where pp.id = t.id
  and (pp.principal_amount <> t.new_principal
       or pp.interest_amount <> t.new_interest);

commit;
