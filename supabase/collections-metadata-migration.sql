-- Run in Supabase SQL Editor if `collections` already exists without `metadata`.

alter table public.collections
  add column if not exists metadata jsonb not null default '{}';