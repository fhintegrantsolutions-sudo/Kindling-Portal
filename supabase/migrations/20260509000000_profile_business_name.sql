-- For non-Individual entity types (LLC, Trust, Corporation, Partnership,
-- Other) we want a dedicated business name on the profile, separate from
-- loan_agreement_title (which is sometimes a slight variant — e.g. how the
-- entity is signed on the agreement). Nullable; populated only when the
-- entity_type is a business.
--
-- Mirror the column on note_registrations so the lead's submission is
-- snapshotted there too; the invite-action copies it onto the profile.

alter table public.profiles
  add column business_name text;

alter table public.note_registrations
  add column business_name text;
