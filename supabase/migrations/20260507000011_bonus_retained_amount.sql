-- Profit bonuses: split the borrower's payment into a portion retained for
-- operational expenses and the remainder distributed pro-rata to lenders.
--
-- Rename `amount` to `gross_amount` (the borrower's total payment) and add
-- `retained_amount` (the portion kept). Distributable = gross - retained,
-- which is what gets pro-rated into participation_bonus_payouts.

alter table public.note_bonuses rename column amount to gross_amount;

alter table public.note_bonuses
  add column retained_amount numeric(14,2) not null default 0
    check (retained_amount >= 0),
  add constraint note_bonuses_distributable_nonneg
    check (retained_amount <= gross_amount);
