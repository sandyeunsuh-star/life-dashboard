# Pattern cover thumbnails (Knitting / Sewing)

New cover uploads are stored in the **public** `collection-assets` bucket:

- `{user_id}/knitting-covers/{uuid}.webp`
- `{user_id}/sewing-covers/{uuid}.webp`

They use stable public URLs and `Cache-Control: 31536000` on upload. PDFs remain in the private `knitting-patterns` / `sewing-patterns` buckets.

Legacy covers under `…/thumbnails/` or `…/covers/` (private bucket) still work via signed URLs cached in `localStorage` until you re-save or replace the cover.