"use client";

import { useCallback, useEffect, useState } from "react";

export type KnittingGridColumns = 3 | 4 | 6;

export const KNITTING_GRID_DENSITY_STORAGE =
  "life-dashboard:knitting-grid-columns";

function readStored(): KnittingGridColumns {
  if (typeof window === "undefined") return 4;
  const raw = window.localStorage.getItem(KNITTING_GRID_DENSITY_STORAGE);
  if (raw === "3" || raw === "6") return Number(raw) as KnittingGridColumns;
  return 4;
}

export function useKnittingGridDensity() {
  const [columns, setColumnsState] = useState<KnittingGridColumns>(4);

  useEffect(() => {
    setColumnsState(readStored());
  }, []);

  const setColumns = useCallback((next: KnittingGridColumns) => {
    setColumnsState(next);
    window.localStorage.setItem(KNITTING_GRID_DENSITY_STORAGE, String(next));
  }, []);

  return [columns, setColumns] as const;
}

export function knittingGridClass(columns: KnittingGridColumns): string {
  switch (columns) {
    case 3:
      return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
    case 6:
      return "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
    case 4:
    default:
      return "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4";
  }
}