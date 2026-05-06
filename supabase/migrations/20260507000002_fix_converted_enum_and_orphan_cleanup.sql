-- Recovery migration:
--
-- 1. The 'converted' value was supposed to be added to request_status by
--    migration 20260506000001, but in production it didn't take effect (the
--    SQL editor likely swallowed it). Add it idempotently here.
--
-- 2. An attempt to approve David's access request created a participation
--    but failed to flip the access_request status (because 'converted' wasn't
--    in the enum). Clean up any orphan participations linked to access
--    requests that are still 'pending'.

alter type public.request_status add value if not exists 'converted';

delete from public.participations
where access_request_id is not null
  and id in (
    select p.id from public.participations p
    join public.access_requests ar on ar.id = p.access_request_id
    where ar.status = 'pending'
  );
