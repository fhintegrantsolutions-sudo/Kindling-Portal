-- Extend access_requests to track funding pre-account, plus add a
-- 'converted' status for the post-promotion lifecycle stage.
--
-- Flow:
--   pending  → admin reviewed, undecided
--   approved → admin engaging; will assign note + work funding off-platform
--   rejected → not pursuing
--   converted → funds cleared + portal user created, see converted_user_id
--
-- The funding columns mirror the participations table so a converted
-- access_request copies its state cleanly into the new participation.

alter type public.request_status add value if not exists 'converted';

alter table public.access_requests
  add column note_id uuid references public.notes(id) on delete set null,
  add column investment_amount numeric(14,2),
  add column funding_received boolean not null default false,
  add column funding_deposited boolean not null default false,
  add column funding_cleared boolean not null default false,
  add column funding_type public.funding_type,
  add column funding_received_date date,
  add column funding_deposited_date date,
  add column funding_cleared_date date,
  add column funding_check_number text,
  add column funding_wire_reference_number text,
  add column funding_notes text,
  add column converted_user_id uuid references auth.users(id) on delete set null,
  add column converted_participation_id uuid references public.participations(id) on delete set null;
