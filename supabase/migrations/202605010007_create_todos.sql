create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  title text not null,
  due_date date,
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  completed boolean not null default false
);

alter table public.todos enable row level security;

create policy "Authenticated users can read todos"
  on public.todos
  for select
  to authenticated
  using (true);

create policy "Authenticated users can create todos"
  on public.todos
  for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "Authenticated users can update todos"
  on public.todos
  for update
  to authenticated
  using (true)
  with check (auth.uid() is not null);

create policy "Authenticated users can delete todos"
  on public.todos
  for delete
  to authenticated
  using (true);
