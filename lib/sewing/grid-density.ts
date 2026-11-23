"use client";

import { useCallback, useEffect, useState } from "react";

export type SewingGridColumns = 3 | 4 | 6;

export const SEWING_GRID_DENSITY_STORAGE =
  "life-dashboard:sewing-grid-columns";

function readStored(): SewingGridColumns {
  if (typeof window === "undefined") return 4;
  const raw = window.localStorage.getItem(SEWING_GRID_DENSITY_STORAGE);
  if (raw === "3" || raw === "6") return Number(raw) as SewingGridColumns;
  return 4;
}

export function useSewingGridDensity() {
  const [columns, setColumnsState] = useState<SewingGridColumns>(4);

  useEffect(() => {
    setColumnsState(readStored());
  }, []);

  const setColumns = useCallback((next: SewingGridColumns) => {
    setColumnsState(next);
    window.localStorage.setItem(SEWING_GRID_DENSITY_STORAGE, String(next));
  }, []);

  return [columns, setColumns] as const;
}

export function sewingGridClass(columns: SewingGridColumns): string {
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