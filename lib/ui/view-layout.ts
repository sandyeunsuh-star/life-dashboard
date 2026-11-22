"use client";

import { useCallback, useEffect, useState } from "react";

export type ViewLayout = "gallery" | "list";

export const VIEW_LAYOUT_STORAGE = {
  collections: "life-dashboard:view:collections",
  items: "life-dashboard:view:items",
} as const;

function readStoredLayout(key: string): ViewLayout {
  if (typeof window === "undefined") {
    return "gallery";
  }
  const value = window.localStorage.getItem(key);
  return value === "list" ? "list" : "gallery";
}

export function useViewLayoutPreference(storageKey: string) {
  const [layout, setLayoutState] = useState<ViewLayout>("gallery");

  useEffect(() => {
    setLayoutState(readStoredLayout(storageKey));
  }, [storageKey]);

  const setLayout = useCallback(
    (next: ViewLayout) => {
      setLayoutState(next);
      window.localStorage.setItem(storageKey, next);
    },
    [storageKey],
  );

  return [layout, setLayout] as const;
}