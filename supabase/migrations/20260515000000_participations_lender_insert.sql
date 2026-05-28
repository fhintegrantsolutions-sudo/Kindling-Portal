-- When a lender registers for a note from /opportunities/[id], the action
-- inserts BOTH a note_registrations row (audit trail) AND a participations
-- row (the actual position). The participations table previously only
-- accepted writes from admins; this policy lets a lender create their own
-- participation as long as the row is keyed to their auth.uid().
--
-- Funding flags aren't constrained here — they default to false at the
-- column level and admin RLS still controls flipping them to true through
-- the funding workflow.

create policy "participations insert own"
  on public.participations
  for insert
  with check (auth.uid() = user_id);
