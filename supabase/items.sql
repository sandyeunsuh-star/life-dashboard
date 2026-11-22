-- Items table + storage bucket policies (run in Supabase SQL Editor).

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  title text not null,
  thumbnail_url text not null,
  drive_url text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists items_collection_id_idx on public.items (collection_id);
create index if not exists items_user_id_idx on public.items (user_id);

alter table public.items enable row level security;

create policy "Users read own items"
  on public.items
  for select
  using (auth.uid() = user_id);

create policy "Users insert own items"
  on public.items
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.collections c
      where c.id = collection_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users update own items"
  on public.items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own items"
  on public.items
  for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('collection-assets', 'collection-assets', true)
on conflict (id) do update
set public = excluded.public;

create policy "Users read own collection assets"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'collection-assets'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Users upload own collection assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'collection-assets'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Users update own collection assets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'collection-assets'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Users delete own collection assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'collection-assets'
    and (storage.foldername (name))[1] = auth.uid()::text
  );