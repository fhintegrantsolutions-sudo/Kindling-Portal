-- Lock down the lender INSERT path on public.participations.
--
-- 20260712000002 left "participations insert own" checking only that the
-- caller owns entity_id, so every other column was caller-controlled through
-- PostgREST. A lender could insert a row that was already funding_received /
-- funding_deposited / funding_cleared (with dates and references), which the
-- admin payment/bonus payout code and the monthly payout report treat as a
-- funded position, and could file it against a private note their chosen
-- entity was never offered.
--
-- A lender-created participation may now only look like what
-- submitRegistration (src/lib/registration/actions.ts) creates: keyed to the
-- caller, awaiting funding, with every admin-managed funding / lifecycle
-- column at its default, on a note the chosen entity may register for. The
-- lender-supplied columns (note_id, invested_amount, submitted_amount,
-- funding_type, funding_notes) are not constrained here. Admin writes
-- ("participations admin all"), the setup-token policy and service-role
-- writes are separate policies or bypass RLS and are unaffected.

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
  );
