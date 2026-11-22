import type { Item } from "../types/item";

export type TagSuggestion = {
  tag: string;
  count: number;
};

export function getTagCountsFromItems(items: Item[]): TagSuggestion[] {
  const map = new Map<string, TagSuggestion>();

  for (const item of items) {
    for (const raw of item.tags ?? []) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { tag: trimmed, count: 1 });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.tag.localeCompare(b.tag);
  });
}

export function getTagCountsFromTagArrays(rows: string[][]): TagSuggestion[] {
  const map = new Map<string, TagSuggestion>();

  for (const tags of rows) {
    for (const raw of tags) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { tag: trimmed, count: 1 });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.tag.localeCompare(b.tag);
  });
}

export function mergeTagSuggestions(
  a: TagSuggestion[],
  b: TagSuggestion[],
): TagSuggestion[] {
  const map = new Map<string, TagSuggestion>();

  for (const entry of [...a, ...b]) {
    const key = entry.tag.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.count += entry.count;
    } else {
      map.set(key, { ...entry });
    }
  }

  return Array.from(map.values()).sort((x, y) => {
    if (y.count !== x.count) return y.count - x.count;
    return x.tag.localeCompare(y.tag);
  });
}

export function hasTagCaseInsensitive(tags: string[], candidate: string): boolean {
  const lower = candidate.toLowerCase();
  return tags.some((t) => t.toLowerCase() === lower);
}