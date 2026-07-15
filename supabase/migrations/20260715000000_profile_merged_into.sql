-- Marks a login that was merged into another during login consolidation.
-- Non-null => this login is banned, its entities were re-parented to
-- `merged_into`, and it should be hidden from the active users list.

alter table public.profiles
  add column if not exists merged_into uuid references public.profiles(id);

comment on column public.profiles.merged_into is
  'Non-null when this login was merged into another (login consolidation). The '
  'login is banned and its entities re-parented to merged_into; hidden from the '
  'active users list. Kept (not deleted) so the merge stays reversible.';

-- Backfill the one merge already performed (Felipe Vazquez): his two absorbed
-- logins point at his surviving login. Idempotent.
update public.profiles ab
  set merged_into = sv.id
  from public.profiles sv
  where sv.email = 'shoboshi112@gmail.com'
    and ab.email in ('fandfsnowball@yahoo.com', 'fandfsdira@yahoo.com')
    and ab.merged_into is null;
