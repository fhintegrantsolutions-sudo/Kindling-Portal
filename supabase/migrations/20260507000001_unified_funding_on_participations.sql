-- Consolidate funding tracking to a single home: public.participations.
-- Both intake paths (access_requests for new leads, note_registrations for
-- returning lenders) now create a participation EARLY in the lifecycle —
-- in an "awaiting funding" state. Admin tracks funding on the participation
-- only. New-lead participations carry user_id=null until an invite is sent.

-- 1. Allow new-lead participations with no user account yet, and add a
--    back-pointer to the access_request that spawned them.
alter table public.participations
  alter column user_id drop not null,
  add column access_request_id uuid references public.access_requests(id) on delete set null;

create index participations_access_request_id_idx
  on public.participations(access_request_id);

-- 2. Drop the now-redundant funding tracking from access_requests.
--    These were added in 20260506000001 and are being undone here.
alter table public.access_requests
  drop column funding_received,
  drop column funding_deposited,
  drop column funding_cleared,
  drop column funding_type,
  drop column funding_received_date,
  drop column funding_deposited_date,
  drop column funding_cleared_date,
  drop column funding_check_number,
  drop column funding_wire_reference_number,
  drop column funding_notes,
  drop column converted_user_id,
  drop column converted_participation_id;

-- 3. Drop the now-redundant funding tracking from note_registrations.
--    These were added in 20260507000000 and are being undone here.
alter table public.note_registrations
  drop column funding_received,
  drop column funding_deposited,
  drop column funding_cleared,
  drop column funding_type,
  drop column funding_received_date,
  drop column funding_deposited_date,
  drop column funding_cleared_date,
  drop column funding_check_number,
  drop column funding_wire_reference_number,
  drop column funding_notes,
  drop column converted_participation_id;
