-- LIFE Dashboard: user settings, weekly plans, shipments
-- Run in Supabase SQL Editor after collections.sql

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  quick_copy jsonb not null default '{
    "korean_address": "",
    "english_address": "",
    "customs_id": ""
  }'::jsonb,
  recurring_template jsonb not null default '{
    "monday": ["Gym: ", "Running: "],
    "tuesday": ["Gym: ", "Running: "],
    "wednesday": ["Gym: ", "Running: "],
    "thursday": ["Gym: ", "Running: "],
    "friday": ["Gym: ", "Running: "],
    "saturday": [],
    "sunday": []
  }'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  days jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_plans_user_week_unique unique (user_id, week_start)
);

create index if not exists weekly_plans_user_week_idx
  on public.weekly_plans (user_id, week_start desc);

alter table public.weekly_plans enable row level security;

create policy "Users read own weekly plans"
  on public.weekly_plans for select
  using (auth.uid() = user_id);

create policy "Users insert own weekly plans"
  on public.weekly_plans for insert
  with check (auth.uid() = user_id);

create policy "Users update own weekly plans"
  on public.weekly_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own weekly plans"
  on public.weekly_plans for delete
  using (auth.uid() = user_id);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  status text not null default 'Ordered'
    check (status in ('Ordered', 'Shipped', 'Customs', 'Delivered')),
  tracking_url text,
  is_delivered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipments_user_active_idx
  on public.shipments (user_id, is_delivered, created_at desc);

alter table public.shipments enable row level security;

create policy "Users read own shipments"
  on public.shipments for select
  using (auth.uid() = user_id);

create policy "Users insert own shipments"
  on public.shipments for insert
  with check (auth.uid() = user_id);

create policy "Users update own shipments"
  on public.shipments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own shipments"
  on public.shipments for delete
  using (auth.uid() = user_id);