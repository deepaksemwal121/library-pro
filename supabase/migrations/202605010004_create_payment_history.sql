-- Create payment_history table to track all member payments
create table if not exists public.payment_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.library_members(id) on delete cascade,
  amount numeric(10, 2) not null,
  transaction_date timestamptz not null default now(),
  payment_for_month date not null,
  payment_method text not null check (payment_method in ('Cash', 'Online')),
  transaction_notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index for faster queries
create index if not exists payment_history_member_id_idx
  on public.payment_history (member_id);

create index if not exists payment_history_transaction_date_idx
  on public.payment_history (transaction_date desc);

create index if not exists payment_history_payment_for_month_idx
  on public.payment_history (payment_for_month desc);

-- Enable row level security
alter table public.payment_history enable row level security;

-- Create policies
create policy "Authenticated users can read payment history"
  on public.payment_history
  for select
  to authenticated
  using (true);

create policy "Authenticated users can create payment records"
  on public.payment_history
  for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "Authenticated users can delete payment records"
  on public.payment_history
  for delete
  to authenticated
  using (true);
