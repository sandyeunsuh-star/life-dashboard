-- Habit Incubator (run in Supabase SQL Editor after weekly-tidy-sync / tidy_point_logs migrations)

create table if not exists public.tidy_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  anchor_cue text,
  tier text not null check (tier in ('simple', 'steady', 'complex')),
  target_days integer not null check (target_days in (21, 30, 66)),
  daily_points integer not null default 5 check (daily_points > 0),
  graduation_points integer not null check (graduation_points > 0),
  status text not null default 'incubating' check (status in ('incubating', 'established')),
  check_in_dates jsonb not null default '[]'::jsonb,
  established_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tidy_habits_user_status_idx
  on public.tidy_habits (user_id, status);

alter table public.tidy_habits enable row level security;

create policy "Users read own tidy habits"
  on public.tidy_habits for select using (auth.uid() = user_id);
create policy "Users insert own tidy habits"
  on public.tidy_habits for insert with check (auth.uid() = user_id);
create policy "Users update own tidy habits"
  on public.tidy_habits for update using (auth.uid() = user_id);
create policy "Users delete own tidy habits"
  on public.tidy_habits for delete using (auth.uid() = user_id);

alter table public.tidy_point_logs
  add column if not exists habit_id uuid references public.tidy_habits (id) on delete set null;

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
    'habit_graduation'
  ));