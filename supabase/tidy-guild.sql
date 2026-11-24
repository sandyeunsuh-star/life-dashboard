-- Tidy Guild: tasks, rewards, point ledger + public motivator images
-- Run in Supabase SQL Editor.

create table if not exists public.tidy_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  icon_key text not null default 'sparkles',
  points integer not null check (points > 0),
  recurrence text not null default 'one_off'
    check (recurrence in ('one_off', 'daily', 'weekly', 'monthly')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tidy_tasks_user_idx
  on public.tidy_tasks (user_id, updated_at desc);

create table if not exists public.tidy_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  points_cost integer not null check (points_cost > 0),
  image_path text,
  link_url text,
  is_goal boolean not null default false,
  is_repeatable boolean not null default false,
  redeemed_count integer not null default 0 check (redeemed_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tidy_rewards_user_idx
  on public.tidy_rewards (user_id, points_cost asc);

create table if not exists public.tidy_point_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  points integer not null,
  kind text not null check (kind in ('task_complete', 'task_undo', 'redeem')),
  task_id uuid references public.tidy_tasks (id) on delete set null,
  reward_id uuid references public.tidy_rewards (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tidy_point_logs_user_idx
  on public.tidy_point_logs (user_id, created_at desc);

alter table public.tidy_tasks enable row level security;
alter table public.tidy_rewards enable row level security;
alter table public.tidy_point_logs enable row level security;

create policy "Users read own tidy tasks"
  on public.tidy_tasks for select using (auth.uid() = user_id);
create policy "Users insert own tidy tasks"
  on public.tidy_tasks for insert with check (auth.uid() = user_id);
create policy "Users update own tidy tasks"
  on public.tidy_tasks for update using (auth.uid() = user_id);
create policy "Users delete own tidy tasks"
  on public.tidy_tasks for delete using (auth.uid() = user_id);

create policy "Users read own tidy rewards"
  on public.tidy_rewards for select using (auth.uid() = user_id);
create policy "Users insert own tidy rewards"
  on public.tidy_rewards for insert with check (auth.uid() = user_id);
create policy "Users update own tidy rewards"
  on public.tidy_rewards for update using (auth.uid() = user_id);
create policy "Users delete own tidy rewards"
  on public.tidy_rewards for delete using (auth.uid() = user_id);

create policy "Users read own tidy point logs"
  on public.tidy_point_logs for select using (auth.uid() = user_id);
create policy "Users insert own tidy point logs"
  on public.tidy_point_logs for insert with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('tidy-rewards', 'tidy-rewards', true)
on conflict (id) do update set public = excluded.public;

create policy "Users read own tidy reward images"
  on storage.objects for select to authenticated
  using (bucket_id = 'tidy-rewards' and (storage.foldername (name))[1] = auth.uid()::text);

create policy "Users upload own tidy reward images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'tidy-rewards' and (storage.foldername (name))[1] = auth.uid()::text);

create policy "Users update own tidy reward images"
  on storage.objects for update to authenticated
  using (bucket_id = 'tidy-rewards' and (storage.foldername (name))[1] = auth.uid()::text);

create policy "Users delete own tidy reward images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'tidy-rewards' and (storage.foldername (name))[1] = auth.uid()::text);