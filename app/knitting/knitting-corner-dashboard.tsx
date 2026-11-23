"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import {
  emptyKnittingFilters,
  filterKnittingPatterns,
} from "@/lib/knitting/filter-patterns";
import {
  knittingGridClass,
  useKnittingGridDensity,
} from "@/lib/knitting/grid-density";
import type { KnittingPatternRow } from "@/lib/supabase/types/knitting-pattern";

import { KnittingFilterBar } from "./knitting-filter-bar";
import { KnittingPatternCard } from "./knitting-pattern-card";
import { KnittingPatternModal } from "./knitting-pattern-modal";
import {
  KnittingSectionTabs,
  type KnittingSection,
} from "./knitting-section-tabs";

type KnittingCornerDashboardProps = {
  initialPatterns: KnittingPatternRow[];
  designerSuggestions: string[];
};

export function KnittingCornerDashboard({
  initialPatterns,
  designerSuggestions: initialDesigners,
}: KnittingCornerDashboardProps) {
  const [patterns, setPatterns] =
    useState<KnittingPatternRow[]>(initialPatterns);
  const [designerSuggestions, setDesignerSuggestions] =
    useState<string[]>(initialDesigners);
  const [section, setSection] = useState<KnittingSection>("library");
  const [filters, setFilters] = useState(emptyKnittingFilters);
  const [columns, setColumns] = useKnittingGridDensity();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KnittingPatternRow | null>(null);

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
      filterKnittingPatterns(scoped, filters, {
        applyStatusFilter: section === "library",
      }),
    [scoped, filters, section],
  );

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(pattern: KnittingPatternRow) {
    setEditing(pattern);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSaved(row: KnittingPatternRow) {
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

  function handleDeleted(id: string) {
    setPatterns((prev) => prev.filter((p) => p.id !== id));
    closeModal();
  }

  function onSavedWithDesigners(row: KnittingPatternRow) {
    const d = row.designer?.trim();
    if (d && !designerSuggestions.includes(d)) {
      setDesignerSuggestions((prev) =>
        [...prev, d].sort((a, b) => a.localeCompare(b)),
      );
    }
    handleSaved(row);
    closeModal();
  }

  function handlePatternUpdated(row: KnittingPatternRow) {
    handleSaved(row);
  }

  const addLabel =
    section === "wishlist" ? "Add to Wishlist" : "Add Pattern";

  const emptyCopy =
    scoped.length === 0
      ? section === "wishlist"
        ? "Save patterns you want to knit later."
        : "Add your first pattern to get started."
      : "No patterns match your filters.";

  return (
    <>
      <section className="w-full">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Knitting Corner
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Patterns, PDFs, and project notes in one place.
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

        <KnittingFilterBar
          filters={filters}
          filteredCount={filtered.length}
          totalCount={scoped.length}
          columns={columns}
          showStatusFilter={section === "library"}
          onColumnsChange={setColumns}
          onChange={setFilters}
          sectionTabs={
            <KnittingSectionTabs
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
          <p className="mt-8 text-center text-sm text-zinc-500">{emptyCopy}</p>
        ) : (
          <div className={`mt-6 ${knittingGridClass(columns)}`}>
            {filtered.map((pattern) => (
              <KnittingPatternCard
                key={pattern.id}
                pattern={pattern}
                wishlistView={section === "wishlist"}
                onOpen={openEdit}
                onUpdated={handlePatternUpdated}
              />
            ))}
          </div>
        )}
      </section>

      <KnittingPatternModal
        open={modalOpen}
        pattern={editing}
        defaultIsWishlist={section === "wishlist"}
        designerSuggestions={designerSuggestions}
        onClose={closeModal}
        onSaved={onSavedWithDesigners}
        onDeleted={handleDeleted}
      />
    </>
  );
}