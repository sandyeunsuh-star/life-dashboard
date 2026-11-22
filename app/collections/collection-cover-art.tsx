import Image from "next/image";

type CollectionCoverArtProps = {
  coverImageUrl?: string | null;
  previewThumbnails?: string[];
  alt: string;
  className?: string;
  aspectClass?: string;
};

export function CollectionCoverArt({
  coverImageUrl,
  previewThumbnails = [],
  alt,
  className = "",
  aspectClass = "aspect-[16/10]",
}: CollectionCoverArtProps) {
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

  if (previewThumbnails.length > 0) {
    return (
      <div
        className={`grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-zinc-200 ${aspectClass} ${className}`}
      >
        {Array.from({ length: 4 }).map((_, index) => {
          const src = previewThumbnails[index];
          return (
            <div
              key={index}
              className="relative bg-zinc-100"
            >
              {src ? (
                <Image
                  src={src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="120px"
                />
              ) : null}
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