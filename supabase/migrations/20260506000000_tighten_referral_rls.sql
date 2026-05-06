-- Tighten referral_codes RLS to match the "admin grants affiliate status" model.
-- Lenders should be able to READ their own code but not create/update/delete it.
-- Admin retains full CRUD via the existing "referral_codes admin all" policy.

drop policy if exists "referral_codes own" on public.referral_codes;

create policy "referral_codes select own" on public.referral_codes
  for select using (auth.uid() = user_id);
