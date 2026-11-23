"use client";

import { useCallback, useEffect, useState } from "react";

export type ItemGridDensity = "large" | "default" | "compact";

export const ITEM_GRID_DENSITY_STORAGE = "life-dashboard:item-grid-density";

function readStoredDensity(): ItemGridDensity {
  if (typeof window === "undefined") {
    return "default";
  }
  const value = window.localStorage.getItem(ITEM_GRID_DENSITY_STORAGE);
  if (value === "large" || value === "compact") {
    return value;
  }
  return "default";
}

export function useItemGridDensityPreference() {
  const [density, setDensityState] = useState<ItemGridDensity>("default");

  useEffect(() => {
    setDensityState(readStoredDensity());
  }, []);

  const setDensity = useCallback((next: ItemGridDensity) => {
    setDensityState(next);
    window.localStorage.setItem(ITEM_GRID_DENSITY_STORAGE, next);
  }, []);

  return [density, setDensity] as const;
}

export type ItemGridDensityClasses = {
  ul: string;
  titlePad: string;
  titleText: string;
  imageSizes: string;
};

export function itemGridDensityClasses(
  density: ItemGridDensity,
): ItemGridDensityClasses {
  switch (density) {
    case "large":
      return {
        ul: "mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3",
        titlePad: "p-3",
        titleText: "truncate text-sm font-medium text-zinc-900",
        imageSizes: "(max-width: 768px) 50vw, 33vw",
      };
    case "compact":
      return {
        ul: "mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6",
        titlePad: "p-2",
        titleText: "truncate text-xs font-medium text-zinc-900",
        imageSizes: "(max-width: 768px) 33vw, 16vw",
      };
    case "default":
    default:
      return {
        ul: "mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4",
        titlePad: "p-3",
        titleText: "truncate text-sm font-medium text-zinc-900",
        imageSizes: "(max-width: 640px) 50vw, 25vw",
      };
  }
}