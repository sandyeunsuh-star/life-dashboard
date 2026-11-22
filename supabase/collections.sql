-- Run in Supabase SQL Editor if the table does not exist yet.

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  slug text not null,
  metadata jsonb not null default '{}',
  cover_image_url text,
  created_at timestamptz not null default now(),
  constraint collections_user_slug_unique unique (user_id, slug)
);

alter table public.collections enable row level security;

create policy "Users read own collections"
  on public.collections
  for select
  using (auth.uid() = user_id);

create policy "Users insert own collections"
  on public.collections
  for insert
  with check (auth.uid() = user_id);

create policy "Users update own collections"
  on public.collections
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own collections"
  on public.collections
  for delete
  using (auth.uid() = user_id);