-- Funding workflow archive: a note's funding round can be archived (per-note,
-- one-way) so it drops out of the active admin funding workflow. This is
-- orthogonal to notes.status — archiving does NOT change the note's lifecycle
-- or any lender-facing view.
alter table public.notes
  add column funding_archived_at timestamptz,
  add column funding_archived_by uuid references auth.users(id) on delete set null;

comment on column public.notes.funding_archived_at is
  'When set, the note''s funding round is archived and hidden from the active admin funding workflow. Null = active.';
comment on column public.notes.funding_archived_by is
  'Admin auth user id who archived the funding round.';
