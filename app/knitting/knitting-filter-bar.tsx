"use client";

import {
  KNITTING_CATEGORIES,
  KNITTING_STATUSES,
  YARN_WEIGHTS,
} from "@/lib/knitting/constants";
import type { KnittingPatternFilters } from "@/lib/knitting/filter-patterns";
import type { KnittingGridColumns } from "@/lib/knitting/grid-density";
import { formInputMdClass } from "@/lib/ui/form-styles";

type KnittingFilterBarProps = {
  filters: KnittingPatternFilters;
  filteredCount: number;
  totalCount: number;
  columns: KnittingGridColumns;
  showStatusFilter?: boolean;
  sectionTabs?: React.ReactNode;
  onColumnsChange: (next: KnittingGridColumns) => void;
  onChange: (next: KnittingPatternFilters) => void;
};

const selectClass = `${formInputMdClass} h-10 py-0`;

export function KnittingFilterBar({
  filters,
  filteredCount,
  totalCount,
  columns,
  showStatusFilter = true,
  sectionTabs,
  onColumnsChange,
  onChange,
}: KnittingFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {sectionTabs ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {sectionTabs}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder="Search title, designer, yarn, needles, gauge, notes…"
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
              title={`${n} columns`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Yarn weight"
          value={filters.yarnWeight}
          onChange={(yarnWeight) => onChange({ ...filters, yarnWeight })}
          options={["All", ...YARN_WEIGHTS]}
        />
        <FilterSelect
          label="Category"
          value={filters.category}
          onChange={(category) => onChange({ ...filters, category })}
          options={["All", ...KNITTING_CATEGORIES]}
        />
        {showStatusFilter ? (
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(status) => onChange({ ...filters, status })}
            options={["All", ...KNITTING_STATUSES]}
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