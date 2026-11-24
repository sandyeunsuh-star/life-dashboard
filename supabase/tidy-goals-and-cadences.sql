-- Tidy goals + biweekly / side_quests cadences

create table if not exists public.tidy_goals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  daily_goal integer not null default 50 check (daily_goal > 0),
  monthly_goal integer not null default 1200 check (monthly_goal > 0),
  updated_at timestamptz not null default now()
);

alter table public.tidy_goals enable row level security;

create policy "Users read own tidy goals"
  on public.tidy_goals for select using (auth.uid() = user_id);
create policy "Users insert own tidy goals"
  on public.tidy_goals for insert with check (auth.uid() = user_id);
create policy "Users update own tidy goals"
  on public.tidy_goals for update using (auth.uid() = user_id);

alter table public.tidy_tasks
  drop constraint if exists tidy_tasks_recurrence_check;

alter table public.tidy_tasks
  add constraint tidy_tasks_recurrence_check
  check (recurrence in (
    'one_off',
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'anytime',
    'side_quests'
  ));