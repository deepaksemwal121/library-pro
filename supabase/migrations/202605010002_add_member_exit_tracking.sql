alter table public.library_members
  add column if not exists left_at date,
  add column if not exists locker_security_refunded boolean not null default false,
  add column if not exists locker_keys_returned boolean not null default false,
  add column if not exists exit_notes text;

