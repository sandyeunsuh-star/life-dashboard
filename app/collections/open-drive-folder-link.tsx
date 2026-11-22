import { FolderOpen } from "lucide-react";

import { parseCollectionMetadata } from "@/lib/supabase/metadata/collection-schema";
import type { CollectionMetadataRecord } from "@/lib/supabase/types/collection-metadata";

type OpenDriveFolderLinkProps = {
  metadata: CollectionMetadataRecord | undefined;
  variant?: "button" | "inline";
  className?: string;
};

export function OpenDriveFolderLink({
  metadata,
  variant = "button",
  className = "",
}: OpenDriveFolderLinkProps) {
  const folderUrl = parseCollectionMetadata(metadata).drive_folder_url;
  if (!folderUrl) return null;

  const base =
    variant === "button"
      ? className ||
        "inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
      : `inline-flex items-center gap-1 text-xs font-medium text-zinc-900 underline ${className}`;

  return (
    <a
      href={folderUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={base}
      onClick={(e) => e.stopPropagation()}
    >
      <FolderOpen className="size-3.5 shrink-0" aria-hidden />
      Open Drive Folder
    </a>
  );
}