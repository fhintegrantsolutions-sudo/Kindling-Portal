-- One-time data fix: rewrite recorded lender payouts on AMORTIZED notes to
-- match the calculator.net amortization calculator (app: generateSchedule
-- ppmtSplit), the standard every lender figure must match:
--
--   * principal = PPMT for that month (from the unrounded payment), rounded;
--   * interest  = IPMT for that month (unrounded payment - unrounded PPMT),
--                 rounded on its own — exactly as calculator.net shows it;
--   * payment #1 only: interest minus the lender's fee share, where
--     fee share = round((service fee + CoSpark membership) x invested / note principal).
--
-- Interest-only notes and borrower payments (note_payments) are not touched.
-- Supersedes 2026-10-19-lender-ppmt-split.sql.
--
-- Run STEP 1 first and review it. To apply, run the separate file
-- 2026-10-21-lender-calculator-net-apply.sql.

-- =====================================================================
-- STEP 1 - PREVIEW (read-only). Lists every payout that would change.
-- =====================================================================
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
    n.note_id as note,
    np.payment_number,
    coalesce(
      nullif(trim(coalesce(pr.first_name, '') || ' ' || coalesce(pr.last_name, '')), ''),
      pr.email,
      pa.id::text
    ) as lender,
    pp.principal_amount as old_principal,
    pp.interest_amount  as old_interest,
    p.fee_share,
    round(p.pmt_exact / power(1 + p.r, p.term - np.payment_number + 1), 2) as new_principal,
    round(p.pmt_exact
      - p.pmt_exact / power(1 + p.r, p.term - np.payment_number + 1), 2) as gross_interest
  from public.participation_payment_payouts pp
  join public.note_payments np on np.id = pp.note_payment_id
  join public.notes n on n.id = np.note_id
  join public.participations pa on pa.id = pp.participation_id
  left join public.profiles pr on pr.id = pa.user_id
  join params p on p.pid = pp.participation_id
  where np.payment_number between 1 and p.term
),
target as (
  select *,
    gross_interest - case when payment_number = 1
                       then least(fee_share, gross_interest) else 0 end as new_interest
  from rowcalc
)
select
  note, payment_number, lender,
  old_principal, new_principal,
  old_interest,  new_interest,
  (new_principal + new_interest) - (old_principal + old_interest) as change_in_payout
from target
where new_principal <> old_principal or new_interest <> old_interest
order by note, payment_number, lender;


-- =====================================================================
-- STEP 2 - APPLY. Same calculation, writes the new amounts.
-- Remove the /* and */ around this block, then run ONLY this block,
-- including the final commit.
-- =====================================================================
/*
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
    round(p.pmt_exact / power(1 + p.r, p.term - np.payment_number + 1), 2) as new_principal,
    round(p.pmt_exact
      - p.pmt_exact / power(1 + p.r, p.term - np.payment_number + 1), 2) as gross_interest
  from public.participation_payment_payouts pp
  join public.note_payments np on np.id = pp.note_payment_id
  join params p on p.pid = pp.participation_id
  where np.payment_number between 1 and p.term
),
target as (
  select id, new_principal,
    gross_interest - case when payment_number = 1
                       then least(fee_share, gross_interest) else 0 end as new_interest
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
*/
