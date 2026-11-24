-- Add Creative Room paper background fields to currents (run if currents.sql was applied earlier)

alter table public.currents_entries
  add column if not exists paper_item_id uuid references public.items (id) on delete set null,
  add column if not exists paper_image_url text,
  add column if not exists paper_title text,
  add column if not exists paper_overlay text;

alter table public.currents_entries drop constraint if exists currents_entries_paper_overlay_check;

alter table public.currents_entries
  add constraint currents_entries_paper_overlay_check check (
    paper_overlay is null or paper_overlay in ('vellum', 'moody')
  );