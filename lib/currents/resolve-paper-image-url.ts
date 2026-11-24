import type { CurrentsDigitalPaper } from "@/lib/supabase/types/currents-paper";

/** Full-bleed spread URL — upgrades legacy thumbnail-only saves when possible. */
export function resolveCurrentsSpreadPaperUrl(
  paperItemId: string | null | undefined,
  paperImageUrl: string | null | undefined,
  digitalPapers: CurrentsDigitalPaper[],
): string | null {
  const stored = paperImageUrl?.trim() || null;

  if (paperItemId) {
    const paper = digitalPapers.find((p) => p.itemId === paperItemId);
    if (paper) {
      if (!stored || stored === paper.thumbUrl) {
        return paper.fullUrl;
      }
      return stored;
    }
  }

  return stored;
}

export function currentsPaperThumbForEntry(
  paperItemId: string | null | undefined,
  paperImageUrl: string | null | undefined,
  digitalPapers: CurrentsDigitalPaper[],
): string | null {
  if (paperItemId) {
    const paper = digitalPapers.find((p) => p.itemId === paperItemId);
    if (paper) return paper.thumbUrl;
  }
  return paperImageUrl?.trim() || null;
}