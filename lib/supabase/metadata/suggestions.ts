import type { Item } from "../types/item";
import { DEFAULT_ITEM_TYPES } from "./constants";
import { parseItemMetadata } from "./schema";

export type ItemMetadataSuggestions = {
  companies: string[];
  designers: string[];
  types: string[];
  published: string[];
};

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function getMetadataSuggestionsFromMetadataRecords(
  records: Record<string, string>[],
): ItemMetadataSuggestions {
  const companies = new Set<string>();
  const designers = new Set<string>();
  const types = new Set<string>(DEFAULT_ITEM_TYPES);
  const published = new Set<string>();

  for (const record of records) {
    const meta = parseItemMetadata(record);
    if (meta.company) companies.add(meta.company);
    if (meta.designer) designers.add(meta.designer);
    if (meta.type) types.add(meta.type);
    if (meta.published) published.add(meta.published);
  }

  return {
    companies: uniqueSorted(companies),
    designers: uniqueSorted(designers),
    types: uniqueSorted(types),
    published: uniqueSorted(published),
  };
}

export function mergeMetadataSuggestions(
  a: ItemMetadataSuggestions,
  b: ItemMetadataSuggestions,
): ItemMetadataSuggestions {
  return {
    companies: uniqueSorted([...a.companies, ...b.companies]),
    designers: uniqueSorted([...a.designers, ...b.designers]),
    types: uniqueSorted([...a.types, ...b.types]),
    published: uniqueSorted([...a.published, ...b.published]),
  };
}

export function getMetadataSuggestionsFromItems(
  items: Item[],
): ItemMetadataSuggestions {
  const companies = new Set<string>();
  const designers = new Set<string>();
  const types = new Set<string>(DEFAULT_ITEM_TYPES);
  const published = new Set<string>();

  for (const item of items) {
    const meta = parseItemMetadata(item.metadata);
    if (meta.company) companies.add(meta.company);
    if (meta.designer) designers.add(meta.designer);
    if (meta.type) types.add(meta.type);
    if (meta.published) published.add(meta.published);
  }

  return {
    companies: uniqueSorted(companies),
    designers: uniqueSorted(designers),
    types: uniqueSorted(types),
    published: uniqueSorted(published),
  };
}