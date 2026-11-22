-- Run in Supabase SQL Editor if `collections` exists without `cover_image_url`.

alter table public.collections
  add column if not exists cover_image_url text;