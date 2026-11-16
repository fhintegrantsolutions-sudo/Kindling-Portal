-- Admin notes on a note are internal ("never surfaced to lenders"), but they
-- lived in notes.admin_notes and the notes SELECT policies ("notes read
-- visible", "notes demo read private") limit rows, not columns, so any lender
-- (or demo login) could read them straight from PostgREST. A column REVOKE
-- would also block admins (same `authenticated` role), so the text moves to its
-- own table that only full admins can read or write.

create table if not exists public.note_admin_notes (
  note_id uuid primary key references public.notes(id) on delete cascade,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists note_admin_notes_set_updated_at on public.note_admin_notes;
create trigger note_admin_notes_set_updated_at before update
  on public.note_admin_notes
  for each row execute function public.set_updated_at();

alter table public.note_admin_notes enable row level security;

-- Full admins only. No lender, demo or participations_admin policy: the only
-- screens that show these notes (/admin/notes/*) are requireAdmin().
drop policy if exists "note_admin_notes admin all" on public.note_admin_notes;
create policy "note_admin_notes admin all"
  on public.note_admin_notes for all
  using (public.is_admin())
  with check (public.is_admin());

-- Move the existing text across.
insert into public.note_admin_notes (note_id, body)
select id, admin_notes
from public.notes
where admin_notes is not null
on conflict (note_id) do nothing;

-- Empty the old column and keep it empty, so nothing internal is left on the
-- lender-readable notes rows. The column itself is kept (not dropped) so the
-- previously deployed app keeps working between applying this migration and
-- deploying the code that reads/writes note_admin_notes; drop it in a later
-- migration once that code is live.
update public.notes set admin_notes = null where admin_notes is not null;

alter table public.notes drop constraint if exists notes_admin_notes_moved;
alter table public.notes
  add constraint notes_admin_notes_moved check (admin_notes is null);

comment on column public.notes.admin_notes is
  'Deprecated: moved to public.note_admin_notes (admin-only). Always null; drop once the app no longer references it.';
