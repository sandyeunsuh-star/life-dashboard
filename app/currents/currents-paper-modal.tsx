"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { CurrentsPaperOverlay } from "@/lib/currents/paper-overlay";
import type { CurrentsDigitalPaper } from "@/lib/supabase/types/currents-paper";
import { useSaveKeyboardShortcut } from "@/lib/ui/use-save-keyboard-shortcut";

type CurrentsPaperModalProps = {
  open: boolean;
  papers: CurrentsDigitalPaper[];
  selectedItemId: string | null;
  overlay: CurrentsPaperOverlay;
  onClose: () => void;
  onApply: (
    paper: CurrentsDigitalPaper | null,
    overlay: CurrentsPaperOverlay,
  ) => void;
};

export function CurrentsPaperModal({
  open,
  papers,
  selectedItemId,
  overlay,
  onClose,
  onApply,
}: CurrentsPaperModalProps) {
  const [draftItemId, setDraftItemId] = useState<string | null>(selectedItemId);
  const [draftOverlay, setDraftOverlay] =
    useState<CurrentsPaperOverlay>(overlay);
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraftItemId(selectedItemId);
    setDraftOverlay(overlay);
    setCollectionFilter(null);
    setSearch("");
  }, [open, overlay, selectedItemId]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const collections = useMemo(() => {
    const names = new Set<string>();
    for (const p of papers) names.add(p.collectionName);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [papers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return papers.filter((p) => {
      if (collectionFilter && p.collectionName !== collectionFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.collectionName.toLowerCase().includes(q)
      );
    });
  }, [collectionFilter, papers, search]);

  const apply = useCallback(() => {
    const paper = draftItemId
      ? papers.find((p) => p.itemId === draftItemId) ?? null
      : null;
    onApply(paper, draftOverlay);
    onClose();
  }, [draftItemId, draftOverlay, onApply, onClose, papers]);

  useSaveKeyboardShortcut(open, false, apply);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/25 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="currents-paper-title"
        className="relative z-10 flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-[#FCFBF9] shadow-xl"
      >
        <header className="border-b border-stone-200/80 px-5 py-4">
          <p className="text-[10px] font-medium tracking-[0.2em] text-stone-500 uppercase">
            Scrapbook
          </p>
          <h2
            id="currents-paper-title"
            className="font-serif text-lg font-medium text-zinc-900"
          >
            Paper background
          </h2>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search papers…"
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-stone-400"
          />

          {collections.length > 0 ? (
            <CollectionFilterPills
              collections={collections}
              collectionFilter={collectionFilter}
              onCollectionFilter={setCollectionFilter}
            />
          ) : null}

          {papers.length === 0 ? (
            <p className="text-sm text-stone-500">
              Add digital papers in Creative Room (item type Paper) to use them
              here.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              <PaperSwatch
                label="None"
                selected={!draftItemId}
                onClick={() => setDraftItemId(null)}
                size="grid"
              />
              {filtered.map((paper) => (
                <PaperSwatch
                  key={paper.itemId}
                  label={paper.title}
                  imageUrl={paper.thumbUrl}
                  selected={draftItemId === paper.itemId}
                  onClick={() => setDraftItemId(paper.itemId)}
                  size="grid"
                />
              ))}
            </div>
          )}

          <MatTintSection
            value={draftOverlay}
            onChange={setDraftOverlay}
            disabled={!draftItemId}
          />
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-stone-200/80 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Apply
          </button>
        </footer>
      </div>
    </div>
  );
}

function CollectionFilterPills({
  collections,
  collectionFilter,
  onCollectionFilter,
}: {
  collections: string[];
  collectionFilter: string | null;
  onCollectionFilter: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onCollectionFilter(null)}
        className={`rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wide ${
          !collectionFilter
            ? "border-zinc-800 bg-zinc-800 text-white"
            : "border-stone-300 bg-white text-stone-700"
        }`}
      >
        All
      </button>
      {collections.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onCollectionFilter(name)}
          className={`rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wide ${
            collectionFilter === name
              ? "border-zinc-800 bg-zinc-800 text-white"
              : "border-stone-300 bg-white text-stone-700"
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

function PaperSwatch({
  label,
  imageUrl,
  selected,
  onClick,
  size,
}: {
  label: string;
  imageUrl?: string;
  selected: boolean;
  onClick: () => void;
  size: "grid" | "sm";
}) {
  const sizeClass =
    size === "grid" ? "aspect-square w-full" : "size-10 shrink-0";

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`relative overflow-hidden rounded-lg border-2 transition ${sizeClass} ${
        selected
          ? "border-zinc-900 ring-2 ring-zinc-900/15"
          : "border-stone-200 hover:border-stone-400"
      } ${imageUrl ? "bg-stone-100" : "bg-stone-50"}`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover"
          sizes={size === "grid" ? "96px" : "40px"}
          loading="lazy"
          unoptimized
        />
      ) : (
        <span className="flex h-full items-center justify-center text-[9px] font-medium tracking-wider text-stone-500 uppercase">
          None
        </span>
      )}
    </button>
  );
}

function MatTintSection({
  value,
  onChange,
  disabled,
}: {
  value: CurrentsPaperOverlay;
  onChange: (overlay: CurrentsPaperOverlay) => void;
  disabled: boolean;
}) {
  const options: { id: CurrentsPaperOverlay; label: string }[] = [
    { id: "vellum", label: "Light vellum" },
    { id: "moody", label: "Moody ink" },
  ];

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium tracking-[0.2em] text-stone-500 uppercase">
        Paper mat tint
      </p>
      <div
        className={`inline-flex rounded-lg border border-stone-200 bg-white p-0.5 ${disabled ? "opacity-45" : ""}`}
        role="group"
        aria-label="Paper mat tint"
      >
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              value === opt.id
                ? "bg-zinc-900 text-white"
                : "text-stone-700 hover:bg-stone-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { PaperSwatch as CurrentsPaperSwatchSm };