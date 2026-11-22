"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getTagCountsFromItems,
  mergeTagSuggestions,
  type TagSuggestion,
} from "@/lib/supabase/items/tag-suggestions";
import { listUserTagsWithCounts } from "@/lib/supabase/queries/tags";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import type { Item } from "@/lib/supabase/types/item";

export function useTagSuggestions(
  enabled: boolean,
  localItems: Item[] = [],
): TagSuggestion[] {
  const [userWide, setUserWide] = useState<TagSuggestion[]>([]);

  const local = useMemo(
    () => getTagCountsFromItems(localItems),
    [localItems],
  );

  useEffect(() => {
    if (!enabled) return;

    void (async () => {
      const supabase = createBrowserClientInstance();
      const { data } = await listUserTagsWithCounts(supabase);
      setUserWide(data ?? []);
    })();
  }, [enabled]);

  return useMemo(
    () => mergeTagSuggestions(local, userWide),
    [local, userWide],
  );
}