-- Split single-field names into first_name + last_name on profiles and
-- borrowers, so we can address users by first name in emails.
--
-- Backfill heuristic: first space splits the original. "John Doe" → John /
-- Doe; "Jane" → Jane / null; "John Q Public" → John / Q Public.

-- profiles --------------------------------------------------------------

alter table public.profiles
  add column first_name text,
  add column last_name text;

update public.profiles
set
  first_name = nullif(split_part(trim(name), ' ', 1), ''),
  last_name = case
    when position(' ' in trim(name)) > 0
    then nullif(trim(substring(trim(name) from position(' ' in trim(name)) + 1)), '')
    else null
  end
where name is not null and trim(name) <> '';

alter table public.profiles drop column name;

-- borrowers --------------------------------------------------------------
-- contact_name was NOT NULL, so first_name will be NOT NULL after backfill.
-- For any borrower that ended up with a blank first_name (shouldn't happen
-- in practice since contact_name was non-empty), we fall back to '—' so
-- the NOT NULL constraint can be applied without errors.

alter table public.borrowers
  add column first_name text,
  add column last_name text;

update public.borrowers
set
  first_name = coalesce(nullif(split_part(trim(contact_name), ' ', 1), ''), '—'),
  last_name = case
    when position(' ' in trim(contact_name)) > 0
    then nullif(trim(substring(trim(contact_name) from position(' ' in trim(contact_name)) + 1)), '')
    else null
  end;

alter table public.borrowers
  alter column first_name set not null,
  drop column contact_name;
