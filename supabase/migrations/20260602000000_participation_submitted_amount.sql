-- Immutable snapshot of the amount the lender originally committed on their
-- form. invested_amount holds the ACTUAL amount received (admin-editable);
-- submitted_amount preserves the original for the admin processing view.
alter table public.participations
  add column submitted_amount numeric(14,2);

-- Backfill: existing rows have not been admin-corrected, so the current
-- invested_amount IS the originally-submitted amount.
update public.participations
  set submitted_amount = invested_amount
  where submitted_amount is null;
