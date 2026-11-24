-- Allow users to fix backdated / mistaken log timestamps (Change Date in Tidy Guild)

create policy "Users update own tidy point logs"
  on public.tidy_point_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);