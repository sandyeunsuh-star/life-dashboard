"use client";

import { Filter, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  countActiveCollectionFilterFields,
  getCollectionFilterFacets,
  hasActiveCollectionFilters,
  type CollectionFilterState,
} from "@/lib/supabase/collections/filter-collections";
import { METADATA_SEASONS, METADATA_YEARS } from "@/lib/supabase/metadata/constants";
import type { CollectionSummary } from "@/lib/supabase/types/collection";
import type { ViewLayout } from "@/lib/ui/view-layout";
import { ViewLayoutToggle } from "@/lib/ui/view-layout-toggle";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

type CollectionsFilterBarProps = {
  collections: CollectionSummary[];
  filters: CollectionFilterState;
  filteredCount: number;
  viewLayout: ViewLayout;
  onViewLayoutChange: (next: ViewLayout) => void;
  onChange: (next: CollectionFilterState) => void;
  onClear: () => void;
};

export function CollectionsFilterBar({
  collections,
  filters,
  filteredCount,
  viewLayout,
  onViewLayoutChange,
  onChange,
  onClear,
}: CollectionsFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const facets = useMemo(
    () => getCollectionFilterFacets(collections),
    [collections],
  );
  const filtersActive = hasActiveCollectionFilters(filters);
  const activeCount = countActiveCollectionFilterFields(filters);

  const seasonOptions = useMemo(
    () => Array.from(new Set([...METADATA_SEASONS, ...facets.seasons])),
    [facets.seasons],
  );
  const yearOptions = useMemo(() => {
    const merged = Array.from(new Set([...METADATA_YEARS, ...facets.years]));
    return merged.sort((a, b) => Number(a) - Number(b));
  }, [facets.years]);

  if (collections.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1">
          <input
            id="collection-search"
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search collections..."
            className={formInputMdClass}
          />
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium text-zinc-900 transition ${
            filtersOpen || activeCount > 0
              ? "border-zinc-900 bg-zinc-50"
              : "border-zinc-300 bg-white hover:bg-zinc-50"
          }`}
          aria-expanded={filtersOpen}
        >
          <Filter className="size-4" aria-hidden />
          Filters
          {activeCount > 0 ? (
            <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>

        <ViewLayoutToggle
          value={viewLayout}
          onChange={onViewLayoutChange}
          ariaLabel="Collections view layout"
        />

        <span className="w-full text-xs font-medium text-zinc-900 sm:ml-auto sm:w-auto">
          {filteredCount} of {collections.length}{" "}
          {collections.length === 1 ? "collection" : "collections"}
        </span>
      </div>

      {filtersActive ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-2 text-sm font-medium text-zinc-900 underline"
        >
          Clear filters
        </button>
      ) : null}

      {filtersOpen ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="collections-filter-company" className={formLabelClass}>
                Company
              </label>
              <select
                id="collections-filter-company"
                value={filters.company}
                onChange={(e) =>
                  onChange({ ...filters, company: e.target.value })
                }
                className={formInputMdClass}
              >
                <option value="">Any</option>
                {facets.companies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="collections-filter-designer" className={formLabelClass}>
                Designer
              </label>
              <select
                id="collections-filter-designer"
                value={filters.designer}
                onChange={(e) =>
                  onChange({ ...filters, designer: e.target.value })
                }
                className={formInputMdClass}
              >
                <option value="">Any</option>
                {facets.designers.map((designer) => (
                  <option key={designer} value={designer}>
                    {designer}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="collections-filter-season" className={formLabelClass}>
                Published — Season
              </label>
              <select
                id="collections-filter-season"
                value={filters.publishedSeason}
                onChange={(e) =>
                  onChange({ ...filters, publishedSeason: e.target.value })
                }
                className={formInputMdClass}
              >
                <option value="">Any</option>
                {seasonOptions.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="collections-filter-year" className={formLabelClass}>
                Published — Year
              </label>
              <select
                id="collections-filter-year"
                value={filters.publishedYear}
                onChange={(e) =>
                  onChange({ ...filters, publishedYear: e.target.value })
                }
                className={formInputMdClass}
              >
                <option value="">Any</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filtersActive ? (
            <button
              type="button"
              onClick={onClear}
              className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              <X className="size-4" aria-hidden />
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}