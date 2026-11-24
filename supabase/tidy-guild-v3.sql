-- Tidy Guild v3: guilt-free Anytime tasks + quick-win log kinds
-- Run after tidy-guild-v2.sql

alter table public.tidy_tasks
  drop constraint if exists tidy_tasks_recurrence_check;

alter table public.tidy_tasks
  add constraint tidy_tasks_recurrence_check
  check (recurrence in (
    'one_off',
    'daily',
    'weekly',
    'monthly',
    'anytime'
  ));

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
    'ad_hoc_win'
  ));