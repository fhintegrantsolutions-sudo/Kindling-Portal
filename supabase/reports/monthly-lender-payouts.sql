-- Monthly lender payouts (read-only report).
--
-- What each payee should be paid for the payments DUE in one calendar month,
-- using the portal's lender rules:
--   * each participation = the lender's invested amount amortized at the
--     note's rate and term (calculator.net), monthly payment rounded to the cent;
--   * interest-only notes pay monthly interest, plus principal in the final month;
--   * payment #1 is reduced by the lender's one-time fee share
--     (service fee + CoSpark membership) x invested / note principal.
-- Only cleared, Active participations are included.
--
-- Change the month on the line marked  <-- MONTH  and run. Compare the
-- "total" column with the vendor list.

with params as (
  select date '2026-10-01' as month_start          -- <-- MONTH (first day)
),
parts as (
  select
    pa.id,
    pa.invested_amount                                   as inv,
    n.note_id,
    n.rate / 100.0 / 12                                  as r,
    n.term_months                                        as term,
    n.interest_type,
    n.first_payment_date                                 as fpd,
    case when n.principal > 0
      then round((greatest(coalesce(n.fee, 0), 0) + greatest(coalesce(n.cospark_fee, 0), 0))
                 * pa.invested_amount / n.principal, 2)
      else 0 end                                         as fee_share,
    -- Payee as it appears on documents: loan agreement title, else the
    -- entity name, else the owner's full name when the entity is "Personal".
    coalesce(
      nullif(trim(e.loan_agreement_title), ''),
      case when e.display_name is null or lower(e.display_name) = 'personal'
        then nullif(trim(coalesce(pr.first_name, '') || ' ' || coalesce(pr.last_name, '')), '')
        else e.display_name end,
      pr.email
    )                                                    as payee
  from public.participations pa
  join public.notes n on n.id = pa.note_id
  left join public.investor_entities e on e.id = pa.entity_id
  left join public.profiles pr on pr.id = coalesce(e.owner_user_id, pa.user_id)
  where pa.funding_cleared
    and pa.status = 'Active'
    and pa.invested_amount > 0
    and n.rate is not null
    and n.term_months > 0
    and n.first_payment_date is not null
),
due as (
  select p.*,
    -- which payment number falls in the chosen month
    ((extract(year from params.month_start) - extract(year from p.fpd)) * 12
      + extract(month from params.month_start) - extract(month from p.fpd) + 1)::int as k
  from parts p cross join params
),
amounts as (
  select payee, note_id, k,
    case
      when interest_type = 'Interest only'
        then round(inv * r, 2) + case when k = term then inv else 0 end
      when r = 0 then round(inv / term, 2)
      else round(inv * r * power(1 + r, term) / (power(1 + r, term) - 1), 2)
    end
    - case when k = 1 then fee_share else 0 end as amount
  from due
  where k between 1 and term
)
select
  payee,
  sum(amount)                                              as total,
  string_agg(note_id || ' #' || k || ' ' || to_char(amount, 'FM999,999,990.00'),
             ', ' order by note_id)                        as detail
from amounts
group by payee
order by payee;
