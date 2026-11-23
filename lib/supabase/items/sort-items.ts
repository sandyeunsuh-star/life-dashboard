import type { Item } from "../types/item";

export type ItemSortMode = "created_asc" | "created_desc" | "title_asc";

export const DEFAULT_ITEM_SORT: ItemSortMode = "created_asc";

export const ITEM_SORT_OPTIONS: { value: ItemSortMode; label: string }[] = [
  { value: "created_asc", label: "Oldest first" },
  { value: "created_desc", label: "Newest first" },
  { value: "title_asc", label: "Title A–Z" },
];

function compareItems(a: Item, b: Item, mode: ItemSortMode): number {
  if (mode === "title_asc") {
    const byTitle = a.title.localeCompare(b.title, undefined, {
      sensitivity: "base",
    });
    if (byTitle !== 0) {
      return byTitle;
    }
    return a.id.localeCompare(b.id);
  }

  const aTime = Date.parse(a.created_at) || 0;
  const bTime = Date.parse(b.created_at) || 0;
  const timeDir = mode === "created_asc" ? 1 : -1;
  if (aTime !== bTime) {
    return (aTime - bTime) * timeDir;
  }

  const byTitle = a.title.localeCompare(b.title, undefined, {
    sensitivity: "base",
  });
  if (byTitle !== 0) {
    return byTitle;
  }

  return a.id.localeCompare(b.id);
}

export function sortCollectionItems(
  items: Item[],
  mode: ItemSortMode = DEFAULT_ITEM_SORT,
): Item[] {
  return [...items].sort((a, b) => compareItems(a, b, mode));
}