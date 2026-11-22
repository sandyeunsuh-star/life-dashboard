"use client";

import { LayoutGrid, List } from "lucide-react";

import type { ViewLayout } from "@/lib/ui/view-layout";

type ViewLayoutToggleProps = {
  value: ViewLayout;
  onChange: (next: ViewLayout) => void;
  ariaLabel?: string;
};

export function ViewLayoutToggle({
  value,
  onChange,
  ariaLabel = "View layout",
}: ViewLayoutToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-zinc-300 bg-white p-0.5"
    >
      <button
        type="button"
        onClick={() => onChange("gallery")}
        className={`inline-flex h-8 w-9 items-center justify-center rounded-md transition ${
          value === "gallery"
            ? "bg-zinc-900 text-white"
            : "text-zinc-900 hover:bg-zinc-100"
        }`}
        aria-pressed={value === "gallery"}
        title="Gallery view"
      >
        <LayoutGrid className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`inline-flex h-8 w-9 items-center justify-center rounded-md transition ${
          value === "list"
            ? "bg-zinc-900 text-white"
            : "text-zinc-900 hover:bg-zinc-100"
        }`}
        aria-pressed={value === "list"}
        title="List view"
      >
        <List className="size-4" aria-hidden />
      </button>
    </div>
  );
}