alter table public.library_members
  add column if not exists is_free_tier boolean not null default false;

create index if not exists library_members_is_free_tier_idx
  on public.library_members (is_free_tier);
