-- Manual admin archive for access requests that went nowhere (e.g. a lead who
-- never followed through). Orthogonal to status: an archived request keeps
-- its status so un-archiving restores it exactly. Null = active.
alter table public.access_requests
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id);

comment on column public.access_requests.archived_at is
  'When an admin archived this request. Null = active (shown in the working tabs).';
