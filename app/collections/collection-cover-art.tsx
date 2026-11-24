import Image from "next/image";

import { ItemThumbnailFrame } from "@/app/collections/item-thumbnail-frame";
import { itemThumbnailFitFromMetadata } from "@/lib/supabase/items/item-thumbnail-fit";
import { logCollectionCoverImageError } from "@/lib/ui/collection-cover-image";

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
  /** Eager-load covers above the fold on `/designer`. */
  imageLoading?: "lazy" | "eager";
  imageContext?: string;
};

export function CollectionCoverArt({
  coverImageUrl,
  previewThumbnails = [],
  previewItems,
  alt,
  className = "",
  aspectClass = "aspect-[16/10]",
  imageLoading = "lazy",
  imageContext = "collection-cover",
}: CollectionCoverArtProps) {
  const cells: CollectionCoverPreviewItem[] =
    previewItems ??
    previewThumbnails.map((thumbnail_url) => ({ thumbnail_url }));
  const previewsWithUrl = cells.filter((cell) => cell.thumbnail_url?.trim());

  const handleImageError = (src: string) => {
    logCollectionCoverImageError(src, imageContext, { alt });
  };

  if (coverImageUrl?.trim()) {
    const src = coverImageUrl.trim();
    return (
      <div
        className={`relative overflow-hidden bg-zinc-100 ${aspectClass} ${className}`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 400px"
          loading={imageLoading}
          decoding="async"
          onError={() => handleImageError(src)}
        />
      </div>
    );
  }

  if (previewsWithUrl.length === 0) {
    return (
      <div
        className={`${aspectClass} ${className} bg-[linear-gradient(135deg,#f4f4f5_25%,#e4e4e7_25%,#e4e4e7_50%,#f4f4f5_50%,#f4f4f5_75%,#e4e4e7_75%,#e4e4e7_100%)] bg-[length:12px_12px]`}
        aria-hidden
      />
    );
  }

  if (previewsWithUrl.length >= 4) {
    return (
      <div
        className={`grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-zinc-200 ${aspectClass} ${className}`}
      >
        {previewsWithUrl.slice(0, 4).map((cell, index) => (
          <div key={index} className="relative min-h-0">
            <ItemThumbnailFrame
              src={cell.thumbnail_url}
              alt=""
              sizes="120px"
              variant="fill"
              fit={itemThumbnailFitFromMetadata(cell.metadata)}
              imageLoading={imageLoading}
              onImageError={handleImageError}
            />
          </div>
        ))}
      </div>
    );
  }

  const first = previewsWithUrl[0]!;
  return (
    <div
      className={`relative overflow-hidden bg-zinc-100 ${aspectClass} ${className}`}
    >
      <ItemThumbnailFrame
        src={first.thumbnail_url}
        alt={alt}
        sizes="(max-width: 768px) 100vw, 400px"
        variant="fill"
        fit={itemThumbnailFitFromMetadata(first.metadata)}
        imageLoading={imageLoading}
        onImageError={handleImageError}
        className="h-full w-full"
      />
    </div>
  );
}