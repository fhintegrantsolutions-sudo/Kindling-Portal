-- Private notes: a note can be marked is_private and only specific lenders
-- can see it on /opportunities and /notes/[id]. Admins see everything via
-- the existing is_admin() check.

alter table public.notes
  add column is_private boolean not null default false;

create table public.note_visibility (
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);

create index note_visibility_user_id_idx on public.note_visibility(user_id);

alter table public.note_visibility enable row level security;

create policy "note_visibility read own" on public.note_visibility
  for select using (auth.uid() = user_id);

create policy "note_visibility admin all" on public.note_visibility
  for all using (public.is_admin()) with check (public.is_admin());

-- Replace the broad "anyone authed sees all notes" policy with one that
-- respects is_private. A user can read a note when:
--   - it is public (NOT is_private), OR
--   - they are admin, OR
--   - they are explicitly granted via note_visibility, OR
--   - they already participate in it (so existing participants keep
--     seeing their own note even if the allowlist changes).
drop policy if exists "notes read auth" on public.notes;

create policy "notes read visible" on public.notes
  for select to authenticated using (
    not is_private
    or public.is_admin()
    or exists (
      select 1 from public.note_visibility nv
      where nv.note_id = notes.id and nv.user_id = auth.uid()
    )
    or exists (
      select 1 from public.participations p
      where p.note_id = notes.id and p.user_id = auth.uid()
    )
  );
