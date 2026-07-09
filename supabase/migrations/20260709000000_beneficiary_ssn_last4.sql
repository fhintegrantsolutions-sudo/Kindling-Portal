-- Optional last 4 digits of a beneficiary's SSN, kept only to help verify the
-- person when contacting them. Stored as text to preserve leading zeros.
alter table public.beneficiaries
  add column if not exists ssn_last4 text
  check (ssn_last4 is null or ssn_last4 ~ '^[0-9]{4}$');
