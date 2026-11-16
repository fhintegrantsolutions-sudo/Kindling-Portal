-- Text-message consent from the public request-access form. The checkbox is
-- optional and unchecked by default (carriers require that consent to texts is
-- never a condition of submitting). sms_consent_at is when it was given, kept as
-- proof of opt-in.
alter table public.access_requests
  add column if not exists sms_consent boolean not null default false,
  add column if not exists sms_consent_at timestamptz;
