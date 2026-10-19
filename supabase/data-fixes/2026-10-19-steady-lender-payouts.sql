-- SUPERSEDED by 2026-10-19-lender-own-amortization.sql — do not run.
--
-- One-time data fix: recompute every recorded lender payout with the app's
-- current split (commit "keep each lender's monthly payment steady to the cent"):
--
--   * each lender's TOTAL payment = round(borrower total x share), with the
--     rounding drift on the largest lender, principal = total - interest
--     (no more $50.39 / $50.40 wobble);
--   * interest = round(borrower interest x share), drift on the largest lender;
--   * payment #1 only: minus the lender's share of the note's CURRENT one-time
--     fees (service fee + CoSpark membership), taken from interest only.
--
-- Shares use each payout's own share_basis, so the same lenders stay on each
-- payment. Borrower payments (note_payments) are not touched.
--
-- Run STEP 1 first and review it. Run STEP 2 only if every change is wanted.

-- =====================================================================
-- STEP 1 - PREVIEW (read-only). Lists every payout that would change.
-- =====================================================================
with p as (
  select
    pp.id,
    pp.note_payment_id,
    pp.share_basis,
    pp.principal_amount as old_principal,
    pp.interest_amount  as old_interest,
    n.note_id           as note,
    np.payment_number,
    np.principal_amount as np_principal,
    np.interest_amount  as np_interest,
    case when np.payment_number = 1
      then greatest(coalesce(n.fee, 0), 0) + greatest(coalesce(n.cospark_fee, 0), 0)
      else 0 end        as fee_total,
    sum(pp.share_basis) over (partition by pp.note_payment_id) as basis_total,
    row_number() over (
      partition by pp.note_payment_id
      order by pp.share_basis desc, pp.participation_id
    ) as rk,
    coalesce(
      nullif(trim(coalesce(pr.first_name, '') || ' ' || coalesce(pr.last_name, '')), ''),
      pr.email,
      pa.id::text
    ) as lender
  from public.participation_payment_payouts pp
  join public.note_payments np on np.id = pp.note_payment_id
  join public.notes n on n.id = np.note_id
  join public.participations pa on pa.id = pp.participation_id
  left join public.profiles pr on pr.id = pa.user_id
  where np.payment_number is not null
),
r as (
  select *,
    round((np_principal + np_interest) * share_basis / basis_total, 2) as t,
    round(np_interest * share_basis / basis_total, 2)                  as i,
    round(fee_total * share_basis / basis_total, 2)                    as f
  from p
  where basis_total > 0
),
d as (
  select *,
    sum(t) over w as sum_t, sum(i) over w as sum_i, sum(f) over w as sum_f
  from r
  window w as (partition by note_payment_id)
),
fin as (
  select *,
    t + case when rk = 1 then (np_principal + np_interest) - sum_t else 0 end as t2,
    i + case when rk = 1 then np_interest - sum_i else 0 end                as i2,
    f + case when rk = 1 then fee_total - sum_f else 0 end                  as f2
  from d
),
calc as (
  select *,
    t2 - i2                    as new_principal,
    i2 - least(f2, i2)         as new_interest
  from fin
)
select
  note, payment_number, lender,
  old_principal, new_principal,
  old_interest,  new_interest,
  (new_principal + new_interest) - (old_principal + old_interest) as change_in_payout
from calc
where new_principal <> old_principal or new_interest <> old_interest
order by note, payment_number, lender;


-- =====================================================================
-- STEP 2 - APPLY. Same calculation, writes the new amounts.
-- =====================================================================
/*
begin;

with p as (
  select
    pp.id,
    pp.note_payment_id,
    pp.share_basis,
    np.payment_number,
    np.principal_amount as np_principal,
    np.interest_amount  as np_interest,
    case when np.payment_number = 1
      then greatest(coalesce(n.fee, 0), 0) + greatest(coalesce(n.cospark_fee, 0), 0)
      else 0 end        as fee_total,
    sum(pp.share_basis) over (partition by pp.note_payment_id) as basis_total,
    row_number() over (
      partition by pp.note_payment_id
      order by pp.share_basis desc, pp.participation_id
    ) as rk
  from public.participation_payment_payouts pp
  join public.note_payments np on np.id = pp.note_payment_id
  join public.notes n on n.id = np.note_id
  where np.payment_number is not null
),
r as (
  select *,
    round((np_principal + np_interest) * share_basis / basis_total, 2) as t,
    round(np_interest * share_basis / basis_total, 2)                  as i,
    round(fee_total * share_basis / basis_total, 2)                    as f
  from p
  where basis_total > 0
),
d as (
  select *,
    sum(t) over w as sum_t, sum(i) over w as sum_i, sum(f) over w as sum_f
  from r
  window w as (partition by note_payment_id)
),
fin as (
  select id,
    t + case when rk = 1 then (np_principal + np_interest) - sum_t else 0 end as t2,
    i + case when rk = 1 then np_interest - sum_i else 0 end                as i2,
    f + case when rk = 1 then fee_total - sum_f else 0 end                  as f2
  from d
)
update public.participation_payment_payouts pp
set principal_amount = fin.t2 - fin.i2,
    interest_amount  = fin.i2 - least(fin.f2, fin.i2)
from fin
where pp.id = fin.id
  and (pp.principal_amount <> fin.t2 - fin.i2
       or pp.interest_amount <> fin.i2 - least(fin.f2, fin.i2));

commit;
*/
