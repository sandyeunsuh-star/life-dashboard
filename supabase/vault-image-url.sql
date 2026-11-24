-- Vault product thumbnails + public storage bucket

alter table public.vault_items
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('vault-images', 'vault-images', true)
on conflict (id) do update
set public = excluded.public;

create policy "Users read own vault images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'vault-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Users upload own vault images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'vault-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Users update own vault images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'vault-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "Users delete own vault images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'vault-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );