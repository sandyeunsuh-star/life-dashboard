import { parseCollectionMetadata } from "../metadata/collection-schema";
import { parsePublished } from "../metadata/schema";
import type { CollectionSummary } from "../types/collection";

export type CollectionFilterState = {
  search: string;
  company: string;
  designer: string;
  publishedSeason: string;
  publishedYear: string;
};

export const emptyCollectionFilters: CollectionFilterState = {
  search: "",
  company: "",
  designer: "",
  publishedSeason: "",
  publishedYear: "",
};

export function getCollectionFilterFacets(collections: CollectionSummary[]) {
  const companies = new Set<string>();
  const designers = new Set<string>();
  const seasons = new Set<string>();
  const years = new Set<string>();

  for (const collection of collections) {
    const album = parseCollectionMetadata(collection.metadata);
    if (album.company) companies.add(album.company);
    if (album.designer) designers.add(album.designer);
    if (album.published) {
      const { season, year } = parsePublished(album.published);
      if (season) seasons.add(season);
      if (year) years.add(year);
    }
  }

  const sortAlpha = (values: Set<string>) =>
    Array.from(values).sort((a, b) => a.localeCompare(b));

  return {
    companies: sortAlpha(companies),
    designers: sortAlpha(designers),
    seasons: sortAlpha(seasons),
    years: Array.from(years).sort((a, b) => Number(a) - Number(b)),
  };
}

export function filterCollections(
  collections: CollectionSummary[],
  filters: CollectionFilterState,
): CollectionSummary[] {
  const search = filters.search.trim().toLowerCase();

  return collections.filter((collection) => {
    const album = parseCollectionMetadata(collection.metadata);

    if (search) {
      const haystack = [
        collection.name,
        collection.description ?? "",
        album.company ?? "",
        album.designer ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (filters.company && album.company !== filters.company) {
      return false;
    }

    if (filters.designer && album.designer !== filters.designer) {
      return false;
    }

    if (filters.publishedSeason || filters.publishedYear) {
      const { season, year } = parsePublished(album.published);
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

export function countActiveCollectionFilterFields(
  filters: CollectionFilterState,
): number {
  let count = 0;
  if (filters.search.trim()) count += 1;
  if (filters.company) count += 1;
  if (filters.designer) count += 1;
  if (filters.publishedSeason) count += 1;
  if (filters.publishedYear) count += 1;
  return count;
}

export function hasActiveCollectionFilters(
  filters: CollectionFilterState,
): boolean {
  return countActiveCollectionFilterFields(filters) > 0;
}