-- One-time data fix: rewrite every recorded lender payout to the lender's OWN
-- amortization schedule, matching the app (generateLenderSchedule):
--
--   * the lender's invested amount amortized at the note's rate and term
--     (e.g. $300,000 at 7.75% / 60 mo = $6,047.09 every month);
--   * month n's interest = round(balance x rate / 12), principal = payment -
--     interest, final month settles the remaining balance;
--   * payment #1 only: interest minus the lender's fee share, where
--     fee share = round((service fee + CoSpark membership) x invested / note principal).
--
-- Uses each participation's CURRENT invested_amount. Borrower payments
-- (note_payments) are not touched. Supersedes 2026-10-19-steady-lender-payouts.sql.
--
-- Run STEP 1 first and review it. Run STEP 2 only if every change is wanted.

-- =====================================================================
-- STEP 1 - PREVIEW (read-only). Lists every payout that would change.
-- =====================================================================
with recursive lp as (
  select distinct
    pa.id                as pid,
    pa.invested_amount   as inv,
    n.rate / 100.0 / 12  as r,
    n.term_months        as term,
    n.interest_type      as itype,
    case when n.principal > 0
          and greatest(coalesce(n.fee, 0), 0) + greatest(coalesce(n.cospark_fee, 0), 0) > 0
      then round((greatest(coalesce(n.fee, 0), 0) + greatest(coalesce(n.cospark_fee, 0), 0))
                 * pa.invested_amount / n.principal, 2)
      else 0 end         as fee_share
  from public.participation_payment_payouts pp
  join public.note_payments np on np.id = pp.note_payment_id
  join public.notes n on n.id = np.note_id
  join public.participations pa on pa.id = pp.participation_id
  where np.payment_number is not null
    and pa.invested_amount > 0
    and n.rate is not null
    and n.term_months > 0
),
params as (
  select *,
    case
      when itype = 'Interest only' then round(inv * r, 2)
      when r = 0 then round(inv / term, 2)
      else round(inv * r * power(1 + r, term) / (power(1 + r, term) - 1), 2)
    end as pmt
  from lp
),
sched as (
  select
    pid, 1 as n,
    round(inv * r, 2) as interest,
    case
      when term = 1 then inv
      when itype = 'Interest only' then 0
      else pmt - round(inv * r, 2)
    end as principal,
    inv - case
      when term = 1 then inv
      when itype = 'Interest only' then 0
      else pmt - round(inv * r, 2)
    end as bal
  from params
  union all
  select
    s.pid, s.n + 1,
    round(s.bal * p.r, 2),
    case
      when s.n + 1 = p.term then s.bal
      when p.itype = 'Interest only' then 0
      else p.pmt - round(s.bal * p.r, 2)
    end,
    s.bal - case
      when s.n + 1 = p.term then s.bal
      when p.itype = 'Interest only' then 0
      else p.pmt - round(s.bal * p.r, 2)
    end
  from sched s
  join params p on p.pid = s.pid
  where s.n < p.term
),
target as (
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
    s.principal         as new_principal,
    s.interest - case when np.payment_number = 1
                   then least(p.fee_share, s.interest) else 0 end as new_interest
  from public.participation_payment_payouts pp
  join public.note_payments np on np.id = pp.note_payment_id
  join public.notes n on n.id = np.note_id
  join public.participations pa on pa.id = pp.participation_id
  left join public.profiles pr on pr.id = pa.user_id
  join params p on p.pid = pp.participation_id
  join sched s on s.pid = pp.participation_id and s.n = np.payment_number
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

with recursive lp as (
  select distinct
    pa.id                as pid,
    pa.invested_amount   as inv,
    n.rate / 100.0 / 12  as r,
    n.term_months        as term,
    n.interest_type      as itype,
    case when n.principal > 0
          and greatest(coalesce(n.fee, 0), 0) + greatest(coalesce(n.cospark_fee, 0), 0) > 0
      then round((greatest(coalesce(n.fee, 0), 0) + greatest(coalesce(n.cospark_fee, 0), 0))
                 * pa.invested_amount / n.principal, 2)
      else 0 end         as fee_share
  from public.participation_payment_payouts pp
  join public.note_payments np on np.id = pp.note_payment_id
  join public.notes n on n.id = np.note_id
  join public.participations pa on pa.id = pp.participation_id
  where np.payment_number is not null
    and pa.invested_amount > 0
    and n.rate is not null
    and n.term_months > 0
),
params as (
  select *,
    case
      when itype = 'Interest only' then round(inv * r, 2)
      when r = 0 then round(inv / term, 2)
      else round(inv * r * power(1 + r, term) / (power(1 + r, term) - 1), 2)
    end as pmt
  from lp
),
sched as (
  select
    pid, 1 as n,
    round(inv * r, 2) as interest,
    case
      when term = 1 then inv
      when itype = 'Interest only' then 0
      else pmt - round(inv * r, 2)
    end as principal,
    inv - case
      when term = 1 then inv
      when itype = 'Interest only' then 0
      else pmt - round(inv * r, 2)
    end as bal
  from params
  union all
  select
    s.pid, s.n + 1,
    round(s.bal * p.r, 2),
    case
      when s.n + 1 = p.term then s.bal
      when p.itype = 'Interest only' then 0
      else p.pmt - round(s.bal * p.r, 2)
    end,
    s.bal - case
      when s.n + 1 = p.term then s.bal
      when p.itype = 'Interest only' then 0
      else p.pmt - round(s.bal * p.r, 2)
    end
  from sched s
  join params p on p.pid = s.pid
  where s.n < p.term
),
target as (
  select
    pp.id,
    s.principal as new_principal,
    s.interest - case when np.payment_number = 1
                   then least(p.fee_share, s.interest) else 0 end as new_interest
  from public.participation_payment_payouts pp
  join public.note_payments np on np.id = pp.note_payment_id
  join params p on p.pid = pp.participation_id
  join sched s on s.pid = pp.participation_id and s.n = np.payment_number
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
