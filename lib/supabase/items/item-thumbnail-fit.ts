import { METADATA_KEYS } from "@/lib/supabase/metadata/constants";
import { parseItemMetadata } from "@/lib/supabase/metadata/schema";

const PAPER_TYPES = new Set(["paper", "patterned paper", "solid paper"]);

/** Full-bleed square thumbs for paper products (type or category). */
export function isPaperItemLabel(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (PAPER_TYPES.has(normalized)) {
    return true;
  }
  return false;
}

export type ItemThumbnailFit = "paper" | "fitted";

export function itemThumbnailFitFromMetadata(
  metadata: Record<string, string> | null | undefined,
): ItemThumbnailFit {
  if (!metadata) {
    return "fitted";
  }

  const candidates = [
    metadata[METADATA_KEYS.type],
    metadata.type,
    metadata.category,
    parseItemMetadata(metadata).type,
  ];

  const isPaper = candidates.some((value) => isPaperItemLabel(value));
  return isPaper ? "paper" : "fitted";
}

/** Same signal Creative Room uses for full-bleed paper thumbnails. */
export function isPaperItemFromMetadata(
  metadata: Record<string, string> | null | undefined,
): boolean {
  return itemThumbnailFitFromMetadata(metadata) === "paper";
}