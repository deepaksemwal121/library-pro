alter table public.library_members
  add column if not exists registered_email text;
