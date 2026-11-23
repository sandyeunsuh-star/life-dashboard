"use client";

import { FolderOpen, Info } from "lucide-react";

import { parseCollectionMetadata } from "@/lib/supabase/metadata/collection-schema";
import type { CollectionMetadataRecord } from "@/lib/supabase/types/collection-metadata";

const iconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition hover:bg-zinc-100";

type CollectionQuickActionsProps = {
  metadata: CollectionMetadataRecord | undefined;
  onEditInfo: () => void;
  className?: string;
};

export function CollectionQuickActions({
  metadata,
  onEditInfo,
  className = "",
}: CollectionQuickActionsProps) {
  const folderUrl = parseCollectionMetadata(metadata).drive_folder_url;

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {folderUrl ? (
        <a
          href={folderUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open Google Drive Folder"
          className={iconButtonClass}
          onClick={(e) => e.stopPropagation()}
        >
          <FolderOpen className="size-4" aria-hidden />
        </a>
      ) : null}
      <button
        type="button"
        title="Edit Collection Info"
        aria-label="Edit Collection Info"
        className={iconButtonClass}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEditInfo();
        }}
      >
        <Info className="size-4" aria-hidden />
      </button>
    </div>
  );
}