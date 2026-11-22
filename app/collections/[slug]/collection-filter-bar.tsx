"use client";

import { X } from "lucide-react";

import {
  type ItemFilterState,
  getStructuredFilterFacets,
  getUniqueTagsFromItems,
  hasActiveItemFilters,
} from "@/lib/supabase/items/filter-items";
import { METADATA_SEASONS, METADATA_YEARS } from "@/lib/supabase/metadata/constants";
import type { Item } from "@/lib/supabase/types/item";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

type CollectionFilterBarProps = {
  items: Item[];
  filters: ItemFilterState;
  filteredCount: number;
  onChange: (next: ItemFilterState) => void;
  onClear: () => void;
};

export function CollectionFilterBar({
  items,
  filters,
  filteredCount,
  onChange,
  onClear,
}: CollectionFilterBarProps) {
  const uniqueTags = getUniqueTagsFromItems(items);
  const facets = getStructuredFilterFacets(items);
  const filtersActive = hasActiveItemFilters(filters);

  const seasonOptions = Array.from(
    new Set([...METADATA_SEASONS, ...facets.seasons]),
  );
  const yearOptions = Array.from(
    new Set([...METADATA_YEARS, ...facets.years]),
  ).sort();

  function toggleTag(tag: string) {
    const lower = tag.toLowerCase();
    const exists = filters.tags.some((t) => t.toLowerCase() === lower);
    const tags = exists
      ? filters.tags.filter((t) => t.toLowerCase() !== lower)
      : [...filters.tags, tag];
    onChange({ ...filters, tags });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">Filter & search</h2>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-900">
          Showing {filteredCount} of {items.length} items
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="item-search" className={formLabelClass}>
            Search
          </label>
          <input
            id="item-search"
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search by title or tag…"
            className={formInputMdClass}
          />
        </div>

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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            <X className="size-4" aria-hidden />
            Clear filters
          </button>
        ) : null}
      </div>
    </section>
  );
}