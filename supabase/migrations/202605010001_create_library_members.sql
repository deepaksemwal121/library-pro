create table if not exists public.library_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  full_name text not null,
  date_of_birth date,
  phone_number text not null,
  id_type text not null,
  id_number text not null,
  registration_date date not null,
  locker_taken boolean not null default false,
  seat_number integer not null,
  seat_floor text not null check (seat_floor in ('first', 'second')),
  fee_amount numeric(10, 2) not null,
  payment_method text not null check (payment_method in ('Cash', 'Online')),
  transaction_notes text,
  paid_until date not null,
  member_status text not null default 'active' check (member_status in ('active', 'inactive'))
);

create unique index if not exists library_members_active_seat_number_key
  on public.library_members (seat_number)
  where member_status = 'active';

alter table public.library_members enable row level security;

create policy "Authenticated users can read members"
  on public.library_members
  for select
  to authenticated
  using (true);

create policy "Authenticated users can create members"
  on public.library_members
  for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "Authenticated users can update members"
  on public.library_members
  for update
  to authenticated
  using (true)
  with check (auth.uid() is not null);

