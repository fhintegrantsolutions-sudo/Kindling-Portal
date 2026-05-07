-- Track how a borrower paid each note_payment / note_bonus, plus a
-- reference (check number for paper checks, wire reference for wires).
-- All optional — admin records them after the fact via the ledger detail sheet.

alter table public.note_payments
  add column payment_method public.funding_type,
  add column check_number text,
  add column wire_reference text;

alter table public.note_bonuses
  add column payment_method public.funding_type,
  add column check_number text,
  add column wire_reference text;
