"use client";

import { Filter, X } from "lucide-react";
import { useState } from "react";

import {
  type ItemFilterState,
  countActiveItemFilterFields,
  getStructuredFilterFacets,
  getUniqueTagsFromItems,
  hasActiveItemFilters,
  removeTagFromFilters,
  toggleTagInFilters,
} from "@/lib/supabase/items/filter-items";
import { TagPill } from "@/lib/ui/tag-pill";
import { METADATA_SEASONS, METADATA_YEARS } from "@/lib/supabase/metadata/constants";
import type { Item } from "@/lib/supabase/types/item";
import {
  ITEM_SORT_OPTIONS,
  type ItemSortMode,
} from "@/lib/supabase/items/sort-items";
import type { ItemGridDensity } from "@/lib/ui/item-grid-density";
import { ItemGridDensityToggle } from "@/lib/ui/item-grid-density-toggle";
import type { ViewLayout } from "@/lib/ui/view-layout";
import { ViewLayoutToggle } from "@/lib/ui/view-layout-toggle";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

type CollectionFilterBarProps = {
  items: Item[];
  collectionMetadata?: import("@/lib/supabase/types/collection-metadata").CollectionMetadataRecord;
  filters: ItemFilterState;
  filteredCount: number;
  viewLayout: ViewLayout;
  onViewLayoutChange: (next: ViewLayout) => void;
  gridDensity: ItemGridDensity;
  onGridDensityChange: (next: ItemGridDensity) => void;
  sort: ItemSortMode;
  onSortChange: (next: ItemSortMode) => void;
  onChange: (next: ItemFilterState) => void;
  onClear: () => void;
};

export function CollectionFilterBar({
  items,
  collectionMetadata = {},
  filters,
  filteredCount,
  viewLayout,
  onViewLayoutChange,
  gridDensity,
  onGridDensityChange,
  sort,
  onSortChange,
  onChange,
  onClear,
}: CollectionFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const uniqueTags = getUniqueTagsFromItems(items);
  const facets = getStructuredFilterFacets(items, collectionMetadata);
  const filtersActive = hasActiveItemFilters(filters);
  const activeCount = countActiveItemFilterFields(filters);

  const seasonOptions = Array.from(
    new Set([...METADATA_SEASONS, ...facets.seasons]),
  );
  const yearOptions = Array.from(
    new Set([...METADATA_YEARS, ...facets.years]),
  ).sort();

  function toggleTag(tag: string) {
    onChange(toggleTagInFilters(filters, tag));
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      {filters.tags.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-900">
            Active tag filters
          </span>
          {filters.tags.map((tag, index) => (
            <TagPill
              key={`${tag}-${index}`}
              tag={tag}
              size="md"
              active
              onRemove={() =>
                onChange(removeTagFromFilters(filters, tag))
              }
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1">
          <input
            id="item-search"
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search by title or tag…"
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

        <div className="flex flex-col gap-0.5">
          <label htmlFor="item-sort" className="sr-only">
            Sort items
          </label>
          <select
            id="item-sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as ItemSortMode)}
            className={`${formInputMdClass} h-10 w-[9.5rem] shrink-0 py-0`}
            aria-label="Sort items"
          >
            {ITEM_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <ViewLayoutToggle
          value={viewLayout}
          onChange={onViewLayoutChange}
          ariaLabel="Items view layout"
        />

        {viewLayout === "gallery" ? (
          <ItemGridDensityToggle
            value={gridDensity}
            onChange={onGridDensityChange}
          />
        ) : null}

        <span className="w-full text-xs font-medium text-zinc-700 sm:ml-auto sm:w-auto">
          {filteredCount} of {items.length} items
        </span>
      </div>

      {filtersActive ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-2 text-sm font-medium text-zinc-900 underline"
        >
          Clear all
        </button>
      ) : null}

      {filtersOpen ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          {uniqueTags.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className={formLabelClass}>Tags</span>
              <div className="flex flex-wrap gap-2">
                {uniqueTags.map((tag) => {
                  const selected = filters.tags.some(
                    (t) => t.toLowerCase() === tag.toLowerCase(),
                  );
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        selected
                          ? "bg-zinc-900 text-white"
                          : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="filter-company" className={formLabelClass}>
                Company
              </label>
              <select
                id="filter-company"
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
              <label htmlFor="filter-type" className={formLabelClass}>
                Type
              </label>
              <select
                id="filter-type"
                value={filters.type}
                onChange={(e) => onChange({ ...filters, type: e.target.value })}
                className={formInputMdClass}
              >
                <option value="">Any</option>
                {facets.types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="filter-designer" className={formLabelClass}>
                Designer
              </label>
              <select
                id="filter-designer"
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
              <label htmlFor="filter-season" className={formLabelClass}>
                Published — Season
              </label>
              <select
                id="filter-season"
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
              <label htmlFor="filter-year" className={formLabelClass}>
                Published — Year
              </label>
              <select
                id="filter-year"
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