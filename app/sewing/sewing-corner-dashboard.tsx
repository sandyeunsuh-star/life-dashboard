"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import {
  emptySewingFilters,
  filterSewingPatterns,
} from "@/lib/sewing/filter-patterns";
import {
  sewingGridClass,
  useSewingGridDensity,
} from "@/lib/sewing/grid-density";
import type { SewingPatternRow } from "@/lib/supabase/types/sewing-pattern";

import { SewingFilterBar } from "./sewing-filter-bar";
import { SewingPatternCard } from "./sewing-pattern-card";
import { SewingPatternModal } from "./sewing-pattern-modal";
import {
  SewingSectionTabs,
  type SewingSection,
} from "./sewing-section-tabs";

type SewingCornerDashboardProps = {
  initialPatterns: SewingPatternRow[];
  designerSuggestions: string[];
};

export function SewingCornerDashboard({
  initialPatterns,
  designerSuggestions: initialDesigners,
}: SewingCornerDashboardProps) {
  const [patterns, setPatterns] = useState(initialPatterns);
  const [designerSuggestions, setDesignerSuggestions] =
    useState(initialDesigners);
  const [section, setSection] = useState<SewingSection>("library");
  const [filters, setFilters] = useState(emptySewingFilters);
  const [columns, setColumns] = useSewingGridDensity();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SewingPatternRow | null>(null);

  const libraryPatterns = useMemo(
    () => patterns.filter((p) => !p.is_wishlist),
    [patterns],
  );
  const wishlistPatterns = useMemo(
    () => patterns.filter((p) => p.is_wishlist),
    [patterns],
  );

  const scoped = section === "wishlist" ? wishlistPatterns : libraryPatterns;

  const filtered = useMemo(
    () =>
      filterSewingPatterns(scoped, filters, {
        applyStatusFilter: section === "library",
      }),
    [scoped, filters, section],
  );

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(pattern: SewingPatternRow) {
    setEditing(pattern);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSaved(row: SewingPatternRow) {
    setPatterns((prev) => {
      const idx = prev.findIndex((p) => p.id === row.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = row;
        return next;
      }
      return [row, ...prev];
    });
  }

  function onSavedWithDesigners(row: SewingPatternRow) {
    const d = row.designer?.trim();
    if (d && !designerSuggestions.includes(d)) {
      setDesignerSuggestions((prev) =>
        [...prev, d].sort((a, b) => a.localeCompare(b)),
      );
    }
    handleSaved(row);
    closeModal();
  }

  const addLabel =
    section === "wishlist" ? "Add to Wishlist" : "Add Pattern";

  return (
    <>
      <section className="w-full">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Sewing Corner
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Patterns, instructions, and fabric notes in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Plus className="size-4" aria-hidden />
            {addLabel}
          </button>
        </div>

        <SewingFilterBar
          filters={filters}
          filteredCount={filtered.length}
          totalCount={scoped.length}
          columns={columns}
          showStatusFilter={section === "library"}
          onColumnsChange={setColumns}
          onChange={setFilters}
          sectionTabs={
            <SewingSectionTabs
              active={section}
              libraryCount={libraryPatterns.length}
              wishlistCount={wishlistPatterns.length}
              onChange={(next) => {
                setSection(next);
                if (next === "wishlist") {
                  setFilters((f) => ({ ...f, status: "All" }));
                }
              }}
            />
          }
        />

        {filtered.length === 0 ? (
          <p className="mt-8 text-center text-sm text-zinc-500">
            {scoped.length === 0
              ? section === "wishlist"
                ? "Save patterns you want to sew later."
                : "Add your first pattern to get started."
              : "No patterns match your filters."}
          </p>
        ) : (
          <div className={`mt-6 ${sewingGridClass(columns)}`}>
            {filtered.map((pattern) => (
              <SewingPatternCard
                key={pattern.id}
                pattern={pattern}
                wishlistView={section === "wishlist"}
                onOpen={openEdit}
                onUpdated={handleSaved}
              />
            ))}
          </div>
        )}
      </section>

      <SewingPatternModal
        open={modalOpen}
        pattern={editing}
        defaultIsWishlist={section === "wishlist"}
        designerSuggestions={designerSuggestions}
        onClose={closeModal}
        onSaved={onSavedWithDesigners}
        onDeleted={(id) => {
          setPatterns((prev) => prev.filter((p) => p.id !== id));
          closeModal();
        }}
      />
    </>
  );
}