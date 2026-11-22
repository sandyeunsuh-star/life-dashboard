"use client";

import { useState } from "react";

import {
  contrastTextOnHex,
  hexDisplayCode,
} from "@/lib/supabase/metadata/palette";

type CollectionPaletteStripProps = {
  palette: string[];
  className?: string;
  heightClass?: string;
  showLabel?: boolean;
  showHexOnSwatches?: boolean;
};

export function CollectionPaletteStrip({
  palette,
  className = "",
  heightClass = "h-32",
  showLabel = true,
  showHexOnSwatches = true,
}: CollectionPaletteStripProps) {
  const [toast, setToast] = useState<string | null>(null);

  if (palette.length === 0) return null;

  async function copyHex(hex: string) {
    const value = hex.startsWith("#") ? hex : `#${hex}`;
    try {
      await navigator.clipboard.writeText(value);
      setToast(`Copied ${value}!`);
      window.setTimeout(() => setToast(null), 1600);
    } catch {
      setToast("Could not copy");
      window.setTimeout(() => setToast(null), 1600);
    }
  }

  return (
    <div className={`relative ${className}`}>
      {showLabel ? (
        <p className="text-xs font-bold tracking-wider uppercase text-zinc-900">
          Color Palette
        </p>
      ) : null}

      <div
        className={`mt-2 flex w-full overflow-hidden rounded-lg ${heightClass}`}
        role="list"
        aria-label="Collection color palette"
      >
        {palette.map((hex, index) => {
          const textColor = contrastTextOnHex(hex);
          const isFirst = index === 0;
          const isLast = index === palette.length - 1;

          return (
            <button
              key={`${hex}-${index}`}
              type="button"
              role="listitem"
              onClick={() => void copyHex(hex)}
              className={`group relative min-w-0 flex-1 cursor-pointer transition hover:brightness-95 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 ${
                isFirst ? "rounded-l-lg" : ""
              } ${isLast ? "rounded-r-lg" : ""}`}
              style={{ backgroundColor: hex }}
              title={`Copy ${hex}`}
            >
              {showHexOnSwatches ? (
                <span
                  className="absolute inset-x-0 bottom-2 text-center font-mono text-xs font-bold tracking-wider uppercase"
                  style={{ color: textColor }}
                >
                  {hexDisplayCode(hex)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {toast ? (
        <p
          role="status"
          className="absolute right-0 top-0 z-20 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
        >
          {toast}
        </p>
      ) : null}
    </div>
  );
}