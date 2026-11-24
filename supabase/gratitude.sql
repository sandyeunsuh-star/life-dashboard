-- Gratitude entries + images bucket + Tidy Guild points (run in Supabase SQL Editor)

create table if not exists public.gratitude_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  favorite_thing text,
  favorite_why text,
  favorite_photo_url text,
  glimmer_1 text,
  glimmer_2 text,
  glimmer_3 text,
  points_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gratitude_user_date_unique unique (user_id, entry_date)
);

create index if not exists gratitude_entries_user_date_idx
  on public.gratitude_entries (user_id, entry_date desc);

alter table public.gratitude_entries enable row level security;

create policy "Users read own gratitude"
  on public.gratitude_entries for select using (auth.uid() = user_id);
create policy "Users insert own gratitude"
  on public.gratitude_entries for insert with check (auth.uid() = user_id);
create policy "Users update own gratitude"
  on public.gratitude_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own gratitude"
  on public.gratitude_entries for delete using (auth.uid() = user_id);

alter table public.tidy_point_logs
  add column if not exists gratitude_entry_id uuid references public.gratitude_entries (id) on delete set null;

alter table public.tidy_point_logs
  drop constraint if exists tidy_point_logs_kind_check;

alter table public.tidy_point_logs
  add constraint tidy_point_logs_kind_check
  check (kind in (
    'task_complete',
    'task_undo',
    'redeem',
    'micro_step',
    'micro_step_undo',
    'mystery_spin',
    'anytime_claim',
    'ad_hoc_win',
    'vault_skip',
    'weekly_task',
    'weekly_task_undo',
    'habit_checkin',
    'habit_checkin_undo',
    'habit_graduation',
    'gratitude'
  ));

insert into storage.buckets (id, name, public)
values ('gratitude-images', 'gratitude-images', true)
on conflict (id) do update set public = excluded.public;

create policy "Users read own gratitude images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'gratitude-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Users upload own gratitude images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gratitude-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Users update own gratitude images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'gratitude-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Users delete own gratitude images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'gratitude-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );