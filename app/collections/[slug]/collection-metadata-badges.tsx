import { parseCollectionMetadata } from "@/lib/supabase/metadata/collection-schema";
import { dedupeTrimmedStrings } from "@/lib/supabase/dedupe-strings";

import type { CollectionMetadataRecord } from "@/lib/supabase/types/collection-metadata";

type CollectionMetadataBadgesProps = {
  metadata: CollectionMetadataRecord | undefined;
  className?: string;
};

export function CollectionMetadataBadges({
  metadata,
  className = "",
}: CollectionMetadataBadgesProps) {
  const album = parseCollectionMetadata(metadata);
  const badges = dedupeTrimmedStrings(
    [album.company, album.designer, album.published].filter(
      (value): value is string => Boolean(value),
    ),
  );

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((label, index) => (
        <span
          key={`${label}-${index}`}
          className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-900"
        >
          {label}
        </span>
      ))}
    </div>
  );
}