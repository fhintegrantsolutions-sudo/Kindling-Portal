-- PREVIEW (read-only). K24002 Niagara Falls Family Trust position, held by
-- Christina Conover-Merrill under MCCM REI, LLC, has only payments 20-23: it
-- was added to the portal after payments 1-19 were recorded. Shows the 19
-- payouts to add, copied from Edson Cruz's matching $5,000 K24002 position
-- (Edson keeps his own; nothing is taken from him).
select
  np.payment_number,
  np.payment_date,
  pp.principal_amount,
  pp.interest_amount,
  pp.share_basis
from public.participation_payment_payouts pp
join public.note_payments np on np.id = pp.note_payment_id
where pp.participation_id = 'baa10460-483d-49c3-8146-72be6e56eb00'
  and np.payment_number between 1 and 19
order by np.payment_number;
