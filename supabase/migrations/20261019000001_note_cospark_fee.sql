-- CoSpark membership: a fixed amount (typically $25 x 60 = $1,500) entered per
-- note and, like the service fee, deducted from the first payment pro-rata
-- across lenders. Nullable, no backfill: null and 0 both mean "none".
alter table public.notes
  add column if not exists cospark_fee numeric(14,2);

comment on column public.notes.cospark_fee is
  'CoSpark membership amount subtracted from the first payment (pro-rated per '
  'lender), in addition to the service fee. Null = none.';
