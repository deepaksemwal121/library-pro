create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  title text not null,
  category text not null,
  amount numeric(10, 2) not null,
  note text,
  date date not null default now()
);

alter table public.expenses enable row level security;

create policy "Authenticated users can read expenses"
  on public.expenses
  for select
  to authenticated
  using (true);

create policy "Authenticated users can create expenses"
  on public.expenses
  for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "Authenticated users can update expenses"
  on public.expenses
  for update
  to authenticated
  using (true)
  with check (auth.uid() is not null);

create policy "Authenticated users can delete expenses"
  on public.expenses
  for delete
  to authenticated
  using (true);
