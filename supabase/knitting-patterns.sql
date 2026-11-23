-- Knitting Corner: patterns table + private storage bucket
-- Run in Supabase SQL Editor (after collections / life-dashboard SQL).

create table if not exists public.knitting_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  designer text,
  category text,
  status text not null default 'In Queue'
    check (status in (
      'In Queue',
      'Cast On / WIP',
      'Finished',
      'Frogged'
    )),
  yarn_weight text,
  needle_size text,
  gauge text,
  yardage text,
  cover_path text,
  pdf_path text,
  pdf_filename text,
  notes text,
  is_wishlist boolean not null default false,
  purchase_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knitting_patterns_user_updated_idx
  on public.knitting_patterns (user_id, updated_at desc);

alter table public.knitting_patterns enable row level security;

create policy "Users read own knitting patterns"
  on public.knitting_patterns for select
  using (auth.uid() = user_id);

create policy "Users insert own knitting patterns"
  on public.knitting_patterns for insert
  with check (auth.uid() = user_id);

create policy "Users update own knitting patterns"
  on public.knitting_patterns for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own knitting patterns"
  on public.knitting_patterns for delete
  using (auth.uid() = user_id);

-- Private bucket for thumbnails + PDFs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knitting-patterns',
  'knitting-patterns',
  false,
  52428800,
  array['image/webp', 'image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Knitting patterns storage select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'knitting-patterns'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Knitting patterns storage insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'knitting-patterns'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Knitting patterns storage update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'knitting-patterns'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Knitting patterns storage delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'knitting-patterns'
    and (storage.foldername(name))[1] = auth.uid()::text
  );