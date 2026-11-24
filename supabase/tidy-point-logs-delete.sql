-- Allow users to delete mistaken point log entries (Recent wins undo)

create policy "Users delete own tidy point logs"
  on public.tidy_point_logs
  for delete
  using (auth.uid() = user_id);