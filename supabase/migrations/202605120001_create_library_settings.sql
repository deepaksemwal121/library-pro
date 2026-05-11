-- Create library settings table
create table if not exists public.library_settings (
  id uuid primary key default gen_random_uuid(),
  library_name text not null default 'Library Pro',
  theme_color text not null default '#2563eb',
  logo_file_path text,
  logo_data_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure only one row exists
alter table public.library_settings enable row level security;

create policy "All authenticated users can read library settings"
  on public.library_settings
  for select
  to authenticated
  using (true);

create policy "Only admins can update library settings"
  on public.library_settings
  for update
  to authenticated
  using (public.current_app_user_role() = 'admin')
  with check (public.current_app_user_role() = 'admin');

create policy "Only admins can insert library settings"
  on public.library_settings
  for insert
  to authenticated
  with check (public.current_app_user_role() = 'admin');

-- Insert default settings if table is empty
insert into public.library_settings (library_name, theme_color, logo_file_path, logo_data_url)
values ('Library Pro', '#2563eb', null, null)
on conflict do nothing;

-- Create trigger for updated_at
create or replace function public.touch_library_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_library_settings_updated_at on public.library_settings;
create trigger touch_library_settings_updated_at
before update on public.library_settings
for each row
execute function public.touch_library_settings_updated_at();
