-- Payment range on participations, for positions transferred between lenders
-- mid-note.
--
-- A participation normally receives every payment on its note (1..term). When
-- a lender transfers a position to another lender effective payment #N, the
-- outgoing position keeps 1..N-1 (last_payment_number = N-1, status
-- 'Transferred') and the incoming lender's new position covers N..term
-- (first_payment_number = N) on the same schedule basis (same
-- invested_amount), so every payment amount is unchanged and each payment is
-- paid to exactly one of them. The app reads these through
-- src/lib/notes/position-range.ts (schedule rows, payout recording, bonus
-- splits, admin totals) and the monthly payout report filters on them.
--
-- Both columns are admin-managed:
--   * the lender UPDATE guard (20261116000002,
--     protect_participation_admin_columns) already protects every column not
--     on its lender-writable allow-list, so these are covered automatically;
--   * the lender INSERT policy is recreated below (verbatim from
--     20261116000001) with the extra requirement that a lender-created row
--     covers the whole note.

alter table public.participations
  add column if not exists first_payment_number integer not null default 1,
  add column if not exists last_payment_number integer null;

alter table public.participations
  drop constraint if exists participations_first_payment_number_check;
alter table public.participations
  add constraint participations_first_payment_number_check
  check (first_payment_number >= 1);

alter table public.participations
  drop constraint if exists participations_last_payment_number_check;
alter table public.participations
  add constraint participations_last_payment_number_check
  check (last_payment_number is null or last_payment_number >= first_payment_number);

comment on column public.participations.first_payment_number is
  'First of the note''s payment numbers this position receives (inclusive; 1 = from the start). Greater than 1 for a position transferred in from another lender mid-note.';
comment on column public.participations.last_payment_number is
  'Last of the note''s payment numbers this position receives (inclusive; null = through the end of the note). Set when the position is transferred to another lender mid-note.';

drop policy if exists "participations insert own" on public.participations;
create policy "participations insert own"
  on public.participations for insert
  with check (
    public.auth_owns_entity(entity_id)
    and user_id = auth.uid()
    and access_request_id is null
    and status = 'Active'
    -- Funding state is admin-only: a lender's row must start awaiting funding.
    and funding_received = false
    and funding_deposited = false
    and funding_cleared = false
    and funding_received_date is null
    and funding_deposited_date is null
    and funding_cleared_date is null
    and funding_investment_amount is null
    and funding_check_number is null
    and funding_wire_reference_number is null
    and funding_check_image_url is null
    and funding_other_type_description is null
    -- Same per-entity offering gate as submitRegistration: a public note, or a
    -- private note granted to THIS entity (or one it already participates in).
    and (
      exists (
        select 1 from public.notes n
        where n.id = participations.note_id
          and not n.is_private
      )
      or exists (
        select 1 from public.note_visibility nv
        where nv.note_id = participations.note_id
          and nv.entity_id = participations.entity_id
      )
      or exists (
        select 1 from public.participations p
        where p.note_id = participations.note_id
          and p.entity_id = participations.entity_id
      )
    )
    -- Payment range is admin-only: a lender's row covers the whole note.
    and first_payment_number = 1
    and last_payment_number is null
  );
