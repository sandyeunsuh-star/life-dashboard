import type { KnittingPatternRow } from "@/lib/supabase/types/knitting-pattern";

import type { KnittingCategory, KnittingStatus, YarnWeight } from "./constants";

export type KnittingPatternFilters = {
  query: string;
  yarnWeight: YarnWeight | "All";
  category: KnittingCategory | "All";
  status: KnittingStatus | "All";
};

export const emptyKnittingFilters: KnittingPatternFilters = {
  query: "",
  yarnWeight: "All",
  category: "All",
  status: "All",
};

function searchableText(p: KnittingPatternRow): string {
  return [
    p.title,
    p.designer,
    p.yarn_weight,
    p.needle_size,
    p.gauge,
    p.notes,
    p.purchase_url,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export type FilterKnittingOptions = {
  applyStatusFilter?: boolean;
};

export function filterKnittingPatterns(
  patterns: KnittingPatternRow[],
  filters: KnittingPatternFilters,
  options?: FilterKnittingOptions,
): KnittingPatternRow[] {
  const q = filters.query.trim().toLowerCase();
  const applyStatus = options?.applyStatusFilter !== false;

  return patterns.filter((p) => {
    if (filters.yarnWeight !== "All" && p.yarn_weight !== filters.yarnWeight) {
      return false;
    }
    if (filters.category !== "All" && p.category !== filters.category) {
      return false;
    }
    if (applyStatus && filters.status !== "All" && p.status !== filters.status) {
      return false;
    }
    if (q && !searchableText(p).includes(q)) {
      return false;
    }
    return true;
  });
}