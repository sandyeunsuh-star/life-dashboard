import type { SewingPatternRow } from "@/lib/supabase/types/sewing-pattern";

import type { FabricType, SewingStatus } from "./constants";
import { LEGACY_SEWING_CATEGORIES, SEWING_CATEGORIES } from "./constants";

export type SewingPatternFilters = {
  query: string;
  fabricType: FabricType | "All";
  category:
    | "All"
    | (typeof SEWING_CATEGORIES)[number]
    | (typeof LEGACY_SEWING_CATEGORIES)[number];
  status: SewingStatus | "All";
};

export const emptySewingFilters: SewingPatternFilters = {
  query: "",
  fabricType: "All",
  category: "All",
  status: "All",
};

function searchableText(p: SewingPatternRow): string {
  return [
    p.title,
    p.designer,
    p.fabric_type,
    p.fabric_recs,
    p.yardage,
    p.notions,
    p.size_info,
    p.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterSewingPatterns(
  patterns: SewingPatternRow[],
  filters: SewingPatternFilters,
  options?: { applyStatusFilter?: boolean },
): SewingPatternRow[] {
  const q = filters.query.trim().toLowerCase();
  const applyStatus = options?.applyStatusFilter !== false;

  return patterns.filter((p) => {
    if (filters.fabricType !== "All") {
      const types = (p.fabric_type ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!types.includes(filters.fabricType)) return false;
    }
    if (filters.category !== "All" && p.category !== filters.category) {
      return false;
    }
    if (applyStatus && filters.status !== "All" && p.status !== filters.status) {
      return false;
    }
    if (q && !searchableText(p).includes(q)) return false;
    return true;
  });
}