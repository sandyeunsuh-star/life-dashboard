-- Tidy Guild v2: micro-steps, bundles, reward tiers, mystery box, point log kinds
-- Run after tidy-guild.sql

alter table public.tidy_tasks
  add column if not exists micro_steps jsonb not null default '[]'::jsonb;

alter table public.tidy_tasks
  add column if not exists bundle_tag text;

alter table public.tidy_rewards
  add column if not exists tier text not null default 'medium'
    check (tier in ('micro', 'medium', 'grail'));

alter table public.tidy_rewards
  add column if not exists is_mystery boolean not null default false;

alter table public.tidy_point_logs
  add column if not exists step_id text;

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
    'mystery_spin'
  ));