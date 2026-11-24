-- Bridge: Vault / Knitting / Sewing → Tidy Guild rewards (non-destructive unlink)

alter table public.tidy_rewards
  add column if not exists vault_item_id uuid
    references public.vault_items (id) on delete set null,
  add column if not exists knitting_pattern_id uuid
    references public.knitting_patterns (id) on delete set null,
  add column if not exists sewing_pattern_id uuid
    references public.sewing_patterns (id) on delete set null,
  add column if not exists image_url text,
  add column if not exists source_url text;

create index if not exists tidy_rewards_vault_item_idx
  on public.tidy_rewards (user_id, vault_item_id)
  where vault_item_id is not null;

create index if not exists tidy_rewards_knitting_idx
  on public.tidy_rewards (user_id, knitting_pattern_id)
  where knitting_pattern_id is not null;

create index if not exists tidy_rewards_sewing_idx
  on public.tidy_rewards (user_id, sewing_pattern_id)
  where sewing_pattern_id is not null;

alter table public.vault_items
  add column if not exists linked_reward_id uuid
    references public.tidy_rewards (id) on delete set null;

alter table public.vault_items
  drop constraint if exists vault_items_status_check;

alter table public.vault_items
  add constraint vault_items_status_check
  check (status in ('paused', 'skipped', 'bought', 'rewarded'));