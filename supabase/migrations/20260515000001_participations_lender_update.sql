-- Lenders can edit their own participation, but only before any funding
-- has been received. Once an admin records a wire / check / ACH against
-- the participation, the amount is locked and can only be changed by an
-- admin (covered by the existing admin policy).
--
-- The policy is row-level only; column-level enforcement (only the
-- invested_amount field is writable from the lender UI, not status or the
-- funding flags) lives in the server action.

create policy "participations update own pre-funding"
  on public.participations
  for update
  using (auth.uid() = user_id and funding_received = false)
  with check (auth.uid() = user_id and funding_received = false);
