import Image from "next/image";

import type { ItemThumbnailFit } from "@/lib/supabase/items/item-thumbnail-fit";

type ItemThumbnailFrameProps = {
  src: string;
  alt: string;
  sizes: string;
  /** `grid`: square card; `inline`: list row thumb; `fill`: parent-sized cell (e.g. cover mosaic). */
  variant?: "grid" | "inline" | "fill";
  /** Paper = full-bleed cover; fitted = padded contain on zinc-50. */
  fit?: ItemThumbnailFit;
  paddingClass?: string;
  className?: string;
};

export function ItemThumbnailFrame({
  src,
  alt,
  sizes,
  variant = "grid",
  fit = "fitted",
  paddingClass,
  className = "",
}: ItemThumbnailFrameProps) {
  const isPaper = fit === "paper";

  const pad = isPaper
    ? "p-0"
    : (paddingClass ??
        (variant === "inline" || variant === "fill" ? "p-1.5" : "p-3.5"));

  const outerClass = isPaper
    ? variant === "grid"
      ? "relative aspect-square bg-zinc-100"
      : variant === "inline"
        ? "relative size-12 shrink-0 overflow-hidden rounded-md bg-zinc-100"
        : "relative h-full w-full min-h-0 bg-zinc-100"
    : variant === "grid"
      ? "relative aspect-square bg-zinc-50"
      : variant === "inline"
        ? "relative size-12 shrink-0 overflow-hidden rounded-md bg-zinc-50"
        : "relative h-full w-full min-h-0 bg-zinc-50";

  const imageClass = isPaper ? "object-cover" : "object-contain";

  return (
    <div className={`${outerClass} ${className}`.trim()}>
      {isPaper ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={imageClass}
          sizes={sizes}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className={`absolute inset-0 ${pad}`}>
          <div className="relative h-full w-full">
            <Image
              src={src}
              alt={alt}
              fill
              className={imageClass}
              sizes={sizes}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      )}
    </div>
  );
}