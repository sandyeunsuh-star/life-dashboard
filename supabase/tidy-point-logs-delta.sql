-- Mirror signed amount in `delta` alongside `points` for balance math
alter table public.tidy_point_logs
  add column if not exists delta integer;

update public.tidy_point_logs
  set delta = points
  where delta is null;

alter table public.tidy_point_logs
  alter column delta set default 0;

update public.tidy_point_logs
  set delta = points
  where delta is distinct from points;