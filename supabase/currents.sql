-- Currents scrapbook issues + public image bucket (run in Supabase SQL Editor)

create table if not exists public.currents_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_ym text not null,
  period_label text not null,
  entry_title text,
  recorded_at timestamptz not null default now(),
  mood_note text,
  prompts jsonb not null default '{}'::jsonb,
  photo_urls jsonb not null default '[]'::jsonb,
  paper_item_id uuid references public.items (id) on delete set null,
  paper_image_url text,
  paper_title text,
  paper_overlay text check (
    paper_overlay is null or paper_overlay in ('vellum', 'moody')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists currents_entries_user_recorded_idx
  on public.currents_entries (user_id, recorded_at desc);

create index if not exists currents_entries_user_period_idx
  on public.currents_entries (user_id, period_ym desc);

alter table public.currents_entries enable row level security;

create policy "Users read own currents"
  on public.currents_entries for select using (auth.uid() = user_id);
create policy "Users insert own currents"
  on public.currents_entries for insert with check (auth.uid() = user_id);
create policy "Users update own currents"
  on public.currents_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own currents"
  on public.currents_entries for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('currents-images', 'currents-images', true)
on conflict (id) do update set public = excluded.public;

create policy "Users read own currents images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'currents-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Users upload own currents images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'currents-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Users update own currents images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'currents-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Users delete own currents images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'currents-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );