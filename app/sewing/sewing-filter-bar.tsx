"use client";

import {
  FABRIC_TYPES,
  LEGACY_SEWING_CATEGORIES,
  SEWING_CATEGORIES,
  SEWING_STATUSES,
} from "@/lib/sewing/constants";
import type { SewingPatternFilters } from "@/lib/sewing/filter-patterns";
import type { SewingGridColumns } from "@/lib/sewing/grid-density";
import { formInputMdClass } from "@/lib/ui/form-styles";

type SewingFilterBarProps = {
  filters: SewingPatternFilters;
  filteredCount: number;
  totalCount: number;
  columns: SewingGridColumns;
  showStatusFilter?: boolean;
  sectionTabs?: React.ReactNode;
  onColumnsChange: (next: SewingGridColumns) => void;
  onChange: (next: SewingPatternFilters) => void;
};

const selectClass = `${formInputMdClass} h-10 py-0`;

export function SewingFilterBar({
  filters,
  filteredCount,
  totalCount,
  columns,
  showStatusFilter = true,
  sectionTabs,
  onColumnsChange,
  onChange,
}: SewingFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {sectionTabs ? <div>{sectionTabs}</div> : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder="Search title, designer, fabric, notions, size, notes…"
          className={`min-w-0 flex-1 ${formInputMdClass}`}
        />
        <div className="flex flex-wrap items-center gap-2">
          {([3, 4, 6] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onColumnsChange(n)}
              className={[
                "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-2 text-sm font-medium transition",
                columns === n
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
              ].join(" ")}
              aria-pressed={columns === n}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Fabric type"
          value={filters.fabricType}
          onChange={(fabricType) => onChange({ ...filters, fabricType })}
          options={["All", ...FABRIC_TYPES]}
        />
        <FilterSelect
          label="Category"
          value={filters.category}
          onChange={(category) => onChange({ ...filters, category })}
          options={[
            "All",
            ...SEWING_CATEGORIES,
            ...LEGACY_SEWING_CATEGORIES,
          ]}
        />
        {showStatusFilter ? (
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(status) => onChange({ ...filters, status })}
            options={["All", ...SEWING_STATUSES]}
          />
        ) : null}
      </div>
      <p className="text-xs text-zinc-500">
        {filteredCount === totalCount
          ? `${totalCount} pattern${totalCount === 1 ? "" : "s"}`
          : `${filteredCount} of ${totalCount} patterns`}
      </p>
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
}) {
  return (
    <label className="inline-flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={selectClass}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}