"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_ITEM_SORT,
  type ItemSortMode,
} from "@/lib/supabase/items/sort-items";

export const ITEM_SORT_STORAGE = "life-dashboard:item-sort";

function readStoredSort(): ItemSortMode {
  if (typeof window === "undefined") {
    return DEFAULT_ITEM_SORT;
  }
  const value = window.localStorage.getItem(ITEM_SORT_STORAGE);
  if (value === "created_asc" || value === "created_desc" || value === "title_asc") {
    return value;
  }
  return DEFAULT_ITEM_SORT;
}

export function useItemSortPreference() {
  const [sort, setSortState] = useState<ItemSortMode>(DEFAULT_ITEM_SORT);

  useEffect(() => {
    setSortState(readStoredSort());
  }, []);

  const setSort = useCallback((next: ItemSortMode) => {
    setSortState(next);
    window.localStorage.setItem(ITEM_SORT_STORAGE, next);
  }, []);

  return [sort, setSort] as const;
}