-- Allow multiple Currents entries per calendar month (run in Supabase SQL Editor)

alter table public.currents_entries
  drop constraint if exists currents_user_period_unique;

alter table public.currents_entries
  add column if not exists entry_title text,
  add column if not exists recorded_at timestamptz;

update public.currents_entries
set recorded_at = coalesce(created_at, now())
where recorded_at is null;

alter table public.currents_entries
  alter column recorded_at set default now(),
  alter column recorded_at set not null;

create index if not exists currents_entries_user_recorded_idx
  on public.currents_entries (user_id, recorded_at desc);