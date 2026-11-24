-- The Vault: impulse cooling-off + Tidy Guild bridge
-- Run after tidy-guild-v3.sql (needs tidy_point_logs)

create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  price_amount numeric(14, 2) not null check (price_amount > 0),
  currency text not null check (currency in ('KRW', 'USD')),
  pause_hours integer not null check (pause_hours > 0),
  reward_points integer not null check (reward_points > 0),
  unlock_at timestamptz not null,
  urge_tag text,
  url text,
  notes text,
  status text not null default 'paused'
    check (status in ('paused', 'skipped', 'bought')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vault_items_user_status_idx
  on public.vault_items (user_id, status, unlock_at desc);

alter table public.vault_items enable row level security;

create policy "Users read own vault items"
  on public.vault_items for select using (auth.uid() = user_id);
create policy "Users insert own vault items"
  on public.vault_items for insert with check (auth.uid() = user_id);
create policy "Users update own vault items"
  on public.vault_items for update using (auth.uid() = user_id);
create policy "Users delete own vault items"
  on public.vault_items for delete using (auth.uid() = user_id);

alter table public.tidy_point_logs
  add column if not exists vault_item_id uuid
    references public.vault_items (id) on delete set null;

alter table public.tidy_point_logs
  add column if not exists reason text;

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
    'vault_skip'
  ));