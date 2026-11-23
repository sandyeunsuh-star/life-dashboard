-- Wishlist columns for knitting_patterns (run if table already exists)

alter table public.knitting_patterns
  add column if not exists is_wishlist boolean not null default false;

alter table public.knitting_patterns
  add column if not exists purchase_url text;

create index if not exists knitting_patterns_user_wishlist_idx
  on public.knitting_patterns (user_id, is_wishlist, updated_at desc);