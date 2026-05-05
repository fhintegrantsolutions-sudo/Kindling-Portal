-- profiles: minimal user metadata, keyed 1:1 to auth.users.
-- Full domain schema (notes, participations, etc.) lands in Phase 3.

create type public.user_role as enum ('admin', 'lender');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'lender',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- security-definer helper avoids RLS recursion when policies need a role check
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);

-- users can update their own row but cannot escalate their role
create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "admins read all profiles" on public.profiles
  for select using (public.is_admin());

create policy "admins update all profiles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

create policy "admins insert profiles" on public.profiles
  for insert with check (public.is_admin());

create policy "admins delete profiles" on public.profiles
  for delete using (public.is_admin());

-- auto-create a profile row whenever an auth.users row is inserted
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
