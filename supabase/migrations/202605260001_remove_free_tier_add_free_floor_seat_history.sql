-- Allow named seats like A-F for Free Floor.
drop index if exists public.library_members_active_seat_number_key;

alter table public.library_members
  alter column seat_number type text using seat_number::text;

create unique index if not exists library_members_active_seat_number_key
  on public.library_members (seat_number)
  where member_status = 'active';

-- The free-tier feature has been replaced by normal zero-fee seats.
drop index if exists public.library_members_is_free_tier_idx;

alter table public.library_members
  drop column if exists is_free_tier;

-- Persist every member seat allotment and seat change for future reference.
create table if not exists public.member_seat_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.library_members(id) on delete cascade,
  from_seat_number text,
  from_seat_floor text,
  to_seat_number text not null,
  to_seat_floor text not null,
  changed_at timestamptz not null default now(),
  reason text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists member_seat_history_member_id_idx
  on public.member_seat_history (member_id);

create index if not exists member_seat_history_changed_at_idx
  on public.member_seat_history (changed_at desc);

alter table public.member_seat_history enable row level security;

create policy "Authenticated users can read member seat history"
  on public.member_seat_history
  for select
  to authenticated
  using (true);

create policy "Authenticated users can create member seat history"
  on public.member_seat_history
  for insert
  to authenticated
  with check (auth.uid() is not null);

insert into public.member_seat_history (
  member_id,
  from_seat_number,
  from_seat_floor,
  to_seat_number,
  to_seat_floor,
  changed_at,
  reason,
  created_by,
  created_at
)
select
  id,
  null,
  null,
  seat_number,
  seat_floor,
  coalesce(member.registration_date::timestamptz, member.created_at),
  'Initial seat allotment',
  member.created_by,
  member.created_at
from public.library_members member
where not exists (
  select 1
  from public.member_seat_history history
  where history.member_id = member.id
);
