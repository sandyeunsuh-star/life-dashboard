-- Sewing Corner: patterns table + private storage bucket

create table if not exists public.sewing_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  designer text,
  category text,
  status text not null default 'In Queue'
    check (status in (
      'In Queue',
      'Cut Out / WIP',
      'Finished',
      'Muslin / Toile'
    )),
  fabric_type text,
  fabric_recs text,
  yardage text,
  notions text,
  size_info text,
  purchase_url text,
  is_wishlist boolean not null default false,
  cover_path text,
  instructions_pdf_path text,
  instructions_drive_url text,
  pattern_pdf_path text,
  pattern_pdf_filename text,
  pattern_drive_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sewing_patterns_user_updated_idx
  on public.sewing_patterns (user_id, updated_at desc);

create index if not exists sewing_patterns_user_wishlist_idx
  on public.sewing_patterns (user_id, is_wishlist, updated_at desc);

alter table public.sewing_patterns enable row level security;

create policy "Users read own sewing patterns"
  on public.sewing_patterns for select
  using (auth.uid() = user_id);

create policy "Users insert own sewing patterns"
  on public.sewing_patterns for insert
  with check (auth.uid() = user_id);

create policy "Users update own sewing patterns"
  on public.sewing_patterns for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own sewing patterns"
  on public.sewing_patterns for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sewing-patterns',
  'sewing-patterns',
  false,
  52428800,
  array['image/webp', 'image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Sewing patterns storage select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'sewing-patterns'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Sewing patterns storage insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'sewing-patterns'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Sewing patterns storage update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'sewing-patterns'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Sewing patterns storage delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'sewing-patterns'
    and (storage.foldername(name))[1] = auth.uid()::text
  );