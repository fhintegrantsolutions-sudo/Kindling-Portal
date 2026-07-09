-- Per-note toggle: does this note have a profit bonus?
-- When false, the lender portal hides the "Profit bonuses" section entirely.
-- New notes default to false (no bonus). Existing notes that already have at
-- least one bonus are backfilled to true so their lenders keep seeing them.

alter table public.notes
  add column if not exists has_profit_bonus boolean not null default false;

update public.notes n
  set has_profit_bonus = true
  where exists (
    select 1 from public.note_bonuses b where b.note_id = n.id
  );
