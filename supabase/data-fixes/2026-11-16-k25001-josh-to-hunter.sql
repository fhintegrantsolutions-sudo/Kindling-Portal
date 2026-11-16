-- PREVIEW (read-only). K25001 transfer: Joshua Harmsworth -> Hunter Purvis,
-- effective payment #10 (Note Participation Ownership Transfer Amendment,
-- March 15, 2026). Hunter starts at $119,055.75 with 51 payments left; every
-- payment amount is unchanged, so his position uses Josh's $135,000 schedule
-- basis with first_payment_number = 10.
--
-- Requires (in order):
--   1. migration 20261116000005_participation_payment_range.sql applied;
--   2. Hunter created in Admin -> Users (role Lender, h.gagepurvis@gmail.com,
--      no invite) with an entity whose loan agreement title is "Hunter Purvis".
-- Then run this preview, then 2026-11-16-k25001-josh-to-hunter-apply.sql.

select 'Josh position' as item,
       pa.id::text, pa.invested_amount::text, pa.status,
       pa.first_payment_number::text || '..' || coalesce(pa.last_payment_number::text, 'end') as range
from public.participations pa
where pa.id = 'b5441cdc-7191-4d75-b200-ef98cc64e24d'

union all
select 'Hunter profile', p.id::text, p.email, p.role::text, null
from public.profiles p
where lower(p.email) = 'h.gagepurvis@gmail.com'

union all
select 'Hunter entity', e.id::text, e.display_name, e.loan_agreement_title, case when e.is_primary then 'primary' end
from public.investor_entities e
join public.profiles p on p.id = e.owner_user_id
where lower(p.email) = 'h.gagepurvis@gmail.com'

union all
select 'Payout to move #' || np.payment_number, pp.id::text,
       pp.principal_amount::text, pp.interest_amount::text, np.payment_date::text
from public.participation_payment_payouts pp
join public.note_payments np on np.id = pp.note_payment_id
where pp.participation_id = 'b5441cdc-7191-4d75-b200-ef98cc64e24d'
  and np.payment_number >= 10
order by 1;
