-- One-time fee Kindling pays on a note, recovered by subtracting it from the
-- first month's payment to lenders. Nullable with NO backfill: notes that
-- predate the fee practice (before K26001) stay null. null and 0 behave
-- identically everywhere in the app.
alter table public.notes
  add column if not exists fee numeric(14,2);

comment on column public.notes.fee is
  'One-time fee subtracted from the first month''s payment (all note types), '
  'pro-rated per lender. Null = no fee.';
