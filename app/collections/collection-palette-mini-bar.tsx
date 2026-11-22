import type { CollectionMetadataRecord } from "@/lib/supabase/types/collection-metadata";
import { parseCollectionMetadata } from "@/lib/supabase/metadata/collection-schema";

type CollectionPaletteMiniBarProps = {
  metadata: CollectionMetadataRecord | undefined;
  className?: string;
};

export function CollectionPaletteMiniBar({
  metadata,
  className = "",
}: CollectionPaletteMiniBarProps) {
  const palette = parseCollectionMetadata(metadata).palette;
  if (!palette?.length) return null;

  return (
    <div
      className={`flex h-2 w-full overflow-hidden rounded-sm ${className}`}
      aria-hidden
    >
      {palette.map((hex, index) => (
        <span
          key={`${hex}-${index}`}
          className="min-w-0 flex-1"
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  );
}