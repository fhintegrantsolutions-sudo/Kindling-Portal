-- Allow the "Update bank account information" change request type.
alter table public.change_requests
  drop constraint if exists change_requests_type_check;

alter table public.change_requests
  add constraint change_requests_type_check check (type in (
    'mailing_address', 'w9', 'entity_email', 'login_email', 'name',
    'la_title', 'la_entity_type', 'la_business_name', 'add_entity',
    'bank_account', 'other'
  ));
