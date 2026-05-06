-- Mirror the access_requests funding gate onto note_registrations so existing
-- lenders' subsequent investments follow the same workflow:
--   submit (auto-approved for logged-in lenders) → admin tracks funding
--   off-platform → funds clear → admin promotes → participation created
--
-- Status lifecycle now:
--   pending → admin hasn't decided (rare; only for non-logged-in submissions)
--   approved → ready for funding tracking (auto-set on submission for lenders)
--   rejected → not pursuing
--   converted → participation has been created
--
-- Funding columns mirror participations and access_requests so promote can
-- copy state across cleanly.

alter table public.note_registrations
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
  add column converted_participation_id uuid references public.participations(id) on delete set null;
