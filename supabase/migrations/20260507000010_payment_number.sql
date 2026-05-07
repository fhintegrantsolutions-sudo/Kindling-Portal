-- Link recorded payments to their position in the amortization schedule.
-- payment_number is the 1-indexed scheduled payment count
-- (1 = first payment, 2 = second, …). Nullable so off-schedule one-offs can
-- still be recorded without a payment_number.

alter table public.note_payments
  add column payment_number integer check (payment_number > 0);

create unique index note_payments_note_payment_number_unique
  on public.note_payments(note_id, payment_number)
  where payment_number is not null;
