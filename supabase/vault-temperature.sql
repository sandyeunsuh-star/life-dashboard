-- Vault temperature check-ins (1–5 desire scale)
-- Run after vault.sql

alter table public.vault_items
  add column if not exists initial_temp integer not null default 4
    check (initial_temp between 1 and 5);

alter table public.vault_items
  add column if not exists current_temp integer not null default 4
    check (current_temp between 1 and 5);

alter table public.vault_items
  add column if not exists temp_history jsonb not null default '[]'::jsonb;