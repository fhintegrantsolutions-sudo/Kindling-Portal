-- A lender's share of a payment normally goes out with the note's payment, on
-- note_payments.payment_date. When one lender's share was sent later (e.g. a
-- first payment caught up the next month), paid_date records when it actually
-- went out. It decides the year the interest counts in and the received date
-- the lender sees. Null means it went out on the payment date.
alter table public.participation_payment_payouts
  add column if not exists paid_date date;

-- Edson Cruz (Katracho Spendthrift Trust): K24002 payment 1 (due 2024-12-23)
-- was paid in January 2025; exact date unknown, so it goes with payment 2.
update public.participation_payment_payouts pp
set paid_date = date '2025-01-23'
from public.note_payments np
where np.id = pp.note_payment_id
  and np.payment_number = 1
  and pp.participation_id = 'baa10460-483d-49c3-8146-72be6e56eb00';
