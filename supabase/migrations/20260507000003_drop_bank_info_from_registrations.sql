-- Drop all banking PII from note_registrations. The portal collects no
-- bank info anywhere — admin handles wire/check/ACH instructions
-- off-platform with the lender directly.
--
-- The note_registrations table stays as a thin audit log of:
--   - which note the lender registered for
--   - the amount they committed to
--   - their name_for_agreement and entity_type (per-investment legal)
--   - whether they acknowledged the disclosures
--   - timestamp
-- Existing bank values in any current rows are deleted with the columns.

alter table public.note_registrations
  drop column bank_name,
  drop column bank_account_type,
  drop column bank_account_number,
  drop column bank_routing_number,
  drop column bank_account_address;
