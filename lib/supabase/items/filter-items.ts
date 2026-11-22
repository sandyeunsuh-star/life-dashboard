import { resolveEffectiveItemMetadata } from "../metadata/resolve";
import { parsePublished } from "../metadata/schema";
import type { CollectionMetadataRecord } from "../types/collection-metadata";
import type { Item } from "../types/item";

export type ItemFilterState = {
  search: string;
  tags: string[];
  company: string;
  type: string;
  designer: string;
  publishedSeason: string;
  publishedYear: string;
};

export const emptyItemFilters: ItemFilterState = {
  search: "",
  tags: [],
  company: "",
  type: "",
  designer: "",
  publishedSeason: "",
  publishedYear: "",
};

export function toggleTagInFilters(
  filters: ItemFilterState,
  tag: string,
): ItemFilterState {
  const trimmed = tag.trim();
  if (!trimmed) return filters;

  const lower = trimmed.toLowerCase();
  const exists = filters.tags.some((t) => t.toLowerCase() === lower);
  const tags = exists
    ? filters.tags.filter((t) => t.toLowerCase() !== lower)
    : [...filters.tags, trimmed];

  return { ...filters, tags };
}

export function removeTagFromFilters(
  filters: ItemFilterState,
  tag: string,
): ItemFilterState {
  const lower = tag.toLowerCase();
  return {
    ...filters,
    tags: filters.tags.filter((t) => t.toLowerCase() !== lower),
  };
}

export function getUniqueTagsFromItems(items: Item[]): string[] {
  const tags = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags ?? []) {
      if (tag.trim()) {
        tags.add(tag.trim());
      }
    }
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

export function getStructuredFilterFacets(
  items: Item[],
  collectionMetadata: CollectionMetadataRecord = {},
) {
  const companies = new Set<string>();
  const types = new Set<string>();
  const designers = new Set<string>();
  const seasons = new Set<string>();
  const years = new Set<string>();

  for (const item of items) {
    const meta = resolveEffectiveItemMetadata(
      item.metadata,
      collectionMetadata,
    );
    if (meta.company) companies.add(meta.company);
    if (meta.type) types.add(meta.type);
    if (meta.designer) designers.add(meta.designer);
    if (meta.published) {
      const { season, year } = parsePublished(meta.published);
      if (season) seasons.add(season);
      if (year) years.add(year);
    }
  }

  const sort = (values: Set<string>) =>
    Array.from(values).sort((a, b) => a.localeCompare(b));

  return {
    companies: sort(companies),
    types: sort(types),
    designers: sort(designers),
    seasons: sort(seasons),
    years: sort(years),
  };
}

export function filterCollectionItems(
  items: Item[],
  filters: ItemFilterState,
  collectionMetadata: CollectionMetadataRecord = {},
): Item[] {
  const search = filters.search.trim().toLowerCase();

  return items.filter((item) => {
    const meta = resolveEffectiveItemMetadata(
      item.metadata,
      collectionMetadata,
    );

    if (search) {
      const titleMatch = item.title.toLowerCase().includes(search);
      const tagMatch = (item.tags ?? []).some((tag) =>
        tag.toLowerCase().includes(search),
      );
      if (!titleMatch && !tagMatch) {
        return false;
      }
    }

    if (filters.tags.length > 0) {
      const itemTags = new Set((item.tags ?? []).map((t) => t.toLowerCase()));
      const hasAllTags = filters.tags.every((tag) =>
        itemTags.has(tag.toLowerCase()),
      );
      if (!hasAllTags) {
        return false;
      }
    }

    if (filters.company && meta.company !== filters.company) {
      return false;
    }

    if (filters.type && meta.type !== filters.type) {
      return false;
    }

    if (filters.designer && meta.designer !== filters.designer) {
      return false;
    }

    if (filters.publishedSeason || filters.publishedYear) {
      const { season, year } = parsePublished(meta.published);
      if (filters.publishedSeason && season !== filters.publishedSeason) {
        return false;
      }
      if (filters.publishedYear && year !== filters.publishedYear) {
        return false;
      }
    }

    return true;
  });
}

export function countActiveItemFilterFields(filters: ItemFilterState): number {
  let count = 0;
  if (filters.search.trim()) count += 1;
  if (filters.tags.length > 0) count += 1;
  if (filters.company) count += 1;
  if (filters.type) count += 1;
  if (filters.designer) count += 1;
  if (filters.publishedSeason) count += 1;
  if (filters.publishedYear) count += 1;
  return count;
}

export function hasActiveItemFilters(filters: ItemFilterState): boolean {
  if (filters.search.trim()) return true;
  if (filters.tags.length > 0) return true;
  if (filters.company) return true;
  if (filters.type) return true;
  if (filters.designer) return true;
  if (filters.publishedSeason) return true;
  if (filters.publishedYear) return true;
  return false;
}