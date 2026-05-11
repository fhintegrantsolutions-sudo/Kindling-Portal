-- Two-stage bonus workflow: admin first issues a Request to the borrower
-- (no payouts yet), then flips it to Received once the funds clear,
-- triggering the pro-rata distribution.
--
-- Existing rows are all already "received" (they came in with full payouts
-- attached) so we default the column to 'received' to keep that semantic.

alter table public.note_bonuses
  add column status text not null default 'received'
    check (status in ('requested', 'received'));

create index note_bonuses_status_idx on public.note_bonuses(status);
