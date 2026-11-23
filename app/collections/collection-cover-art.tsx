import Image from "next/image";

import { ItemThumbnailFrame } from "@/app/collections/item-thumbnail-frame";
import { itemThumbnailFitFromMetadata } from "@/lib/supabase/items/item-thumbnail-fit";

export type CollectionCoverPreviewItem = {
  thumbnail_url: string;
  metadata?: Record<string, string>;
};

type CollectionCoverArtProps = {
  coverImageUrl?: string | null;
  previewThumbnails?: string[];
  previewItems?: CollectionCoverPreviewItem[];
  alt: string;
  className?: string;
  aspectClass?: string;
};

export function CollectionCoverArt({
  coverImageUrl,
  previewThumbnails = [],
  previewItems,
  alt,
  className = "",
  aspectClass = "aspect-[16/10]",
}: CollectionCoverArtProps) {
  const cells: CollectionCoverPreviewItem[] =
    previewItems ??
    previewThumbnails.map((thumbnail_url) => ({ thumbnail_url }));
  if (coverImageUrl) {
    return (
      <div
        className={`relative overflow-hidden bg-zinc-100 ${aspectClass} ${className}`}
      >
        <Image
          src={coverImageUrl}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 400px"
        />
      </div>
    );
  }

  if (cells.length > 0) {
    return (
      <div
        className={`grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-zinc-200 ${aspectClass} ${className}`}
      >
        {Array.from({ length: 4 }).map((_, index) => {
          const cell = cells[index];
          return (
            <div key={index} className="relative min-h-0">
              {cell?.thumbnail_url ? (
                <ItemThumbnailFrame
                  src={cell.thumbnail_url}
                  alt=""
                  sizes="120px"
                  variant="fill"
                  fit={itemThumbnailFitFromMetadata(cell.metadata)}
                />
              ) : (
                <div className="h-full w-full bg-zinc-50" aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`${aspectClass} ${className} bg-[linear-gradient(135deg,#f4f4f5_25%,#e4e4e7_25%,#e4e4e7_50%,#f4f4f5_50%,#f4f4f5_75%,#e4e4e7_75%,#e4e4e7_100%)] bg-[length:12px_12px]`}
      aria-hidden
    />
  );
}