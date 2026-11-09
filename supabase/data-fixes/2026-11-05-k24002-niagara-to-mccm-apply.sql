-- APPLY. Adds K24002 payments 1-19 to Christina Conover-Merrill's
-- MCCM REI, LLC position (Niagara Falls Family Trust). Run the preview first.
begin;

insert into public.participation_payment_payouts
  (note_payment_id, participation_id, principal_amount, interest_amount, share_basis)
select
  pp.note_payment_id,
  'f4b94081-c4bc-4964-9788-79b16ce7f047',
  pp.principal_amount,
  pp.interest_amount,
  pp.share_basis
from public.participation_payment_payouts pp
join public.note_payments np on np.id = pp.note_payment_id
where pp.participation_id = 'baa10460-483d-49c3-8146-72be6e56eb00'
  and np.payment_number between 1 and 19
on conflict (note_payment_id, participation_id) do nothing;

commit;
