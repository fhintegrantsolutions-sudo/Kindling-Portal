-- Principal isn't always known when admin creates a note. Allow null.
alter table public.notes alter column principal drop not null;
