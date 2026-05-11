do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_user_role' and typnamespace = 'public'::regnamespace) then
    create type public.app_user_role as enum ('admin', 'manager');
  end if;
end;
$$;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.app_user_role not null default 'manager',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add role column if it doesn't exist (for tables created before this migration)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'user_profiles' 
    and column_name = 'role'
  ) then
    alter table public.user_profiles 
    add column role public.app_user_role not null default 'manager';
  end if;
end;
$$;

create index if not exists user_profiles_role_idx
  on public.user_profiles (role);

create unique index if not exists user_profiles_email_key
  on public.user_profiles (lower(email));

create or replace function public.touch_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_profiles_updated_at on public.user_profiles;
create trigger touch_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.touch_user_profiles_updated_at();

create or replace function public.current_app_user_role()
returns public.app_user_role
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.user_profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.prevent_non_admin_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and public.current_app_user_role() is distinct from 'admin' then
    raise exception 'Only admins can change user roles.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_non_admin_role_change on public.user_profiles;
create trigger prevent_non_admin_role_change
before update on public.user_profiles
for each row
execute function public.prevent_non_admin_role_change();

create or replace function public.has_user_profiles()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from public.user_profiles)
$$;

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1), 'User'),
    coalesce(new.email, ''),
    'manager'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_user_profile_on_auth_signup on auth.users;
create trigger create_user_profile_on_auth_signup
after insert on auth.users
for each row
execute function public.handle_new_auth_user_profile();

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read team profiles" on public.user_profiles;
create policy "Users can read team profiles"
  on public.user_profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_app_user_role() in ('admin', 'manager')
  );

drop policy if exists "Users can bootstrap or admins can create profiles" on public.user_profiles;
create policy "Users can bootstrap or admins can create profiles"
  on public.user_profiles
  for insert
  to authenticated
  with check (
    (id = auth.uid() and public.has_user_profiles() = false)
    or public.current_app_user_role() = 'admin'
  );

drop policy if exists "Users can update themselves or admins can update profiles" on public.user_profiles;
create policy "Users can update themselves or admins can update profiles"
  on public.user_profiles
  for update
  to authenticated
  using (
    id = auth.uid()
    or public.current_app_user_role() = 'admin'
  )
  with check (
    id = auth.uid()
    or public.current_app_user_role() = 'admin'
  );

drop policy if exists "Admins can delete profiles" on public.user_profiles;
create policy "Admins can delete profiles"
  on public.user_profiles
  for delete
  to authenticated
  using (public.current_app_user_role() = 'admin');

-- Promote initial admin user (bypass trigger for initial setup)
DO $$
BEGIN
  -- Disable the role change trigger temporarily for initial setup
  ALTER TABLE public.user_profiles 
  DISABLE TRIGGER prevent_non_admin_role_change;
  
  -- Promote the specified email to admin
  UPDATE public.user_profiles 
  SET role = 'admin'
  WHERE email = 'deepaksemwal121@gmail.com';
  
  -- Re-enable the trigger
  ALTER TABLE public.user_profiles 
  ENABLE TRIGGER prevent_non_admin_role_change;
END;
$$;
