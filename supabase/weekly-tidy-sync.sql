-- Weekly board ↔ Tidy Guild sync (point logs)
-- Run after vault.sql / tidy-guild-v3.sql

alter table public.tidy_point_logs
  add column if not exists weekly_task_id text;

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
    'weekly_task_undo'
  ));