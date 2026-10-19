-- Per-note service fee rate, as a percent of the note's total projected
-- interest (e.g. 0.91 = 0.91%). Null = the standard 0.91%. notes.fee stores
-- the resulting dollar amount, computed on save.
alter table public.notes
  add column if not exists service_fee_rate numeric(6,4);

comment on column public.notes.service_fee_rate is
  'Service fee as a percent of total projected interest (0.91 = 0.91%). '
  'Null = default 0.91.';
