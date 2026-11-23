"use client";

import type { ItemGridDensity } from "@/lib/ui/item-grid-density";

type ItemGridDensityToggleProps = {
  value: ItemGridDensity;
  onChange: (next: ItemGridDensity) => void;
};

const OPTIONS: { id: ItemGridDensity; label: string; title: string }[] = [
  { id: "large", label: "L", title: "Large thumbnails (3 across)" },
  { id: "default", label: "M", title: "Medium thumbnails (4 across)" },
  { id: "compact", label: "S", title: "Compact thumbnails (6 across)" },
];

export function ItemGridDensityToggle({
  value,
  onChange,
}: ItemGridDensityToggleProps) {
  return (
    <div
      role="group"
      aria-label="Thumbnail grid size"
      className="inline-flex rounded-lg border border-zinc-300 bg-white p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          title={option.title}
          className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-xs font-semibold transition ${
            value === option.id
              ? "bg-zinc-900 text-white"
              : "text-zinc-900 hover:bg-zinc-100"
          }`}
          aria-pressed={value === option.id}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}