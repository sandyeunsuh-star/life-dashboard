import { formatSupabaseError } from "@/lib/supabase/errors";
import { compressToWebpThumbnail } from "@/lib/supabase/images/compress-thumbnail";
import {
  metadataForNewUpload,
  serializeItemMetadata,
  type ItemMetadata,
} from "@/lib/supabase/metadata/schema";
import { guessItemTitleFromFileName } from "@/lib/supabase/metadata/title-from-filename";
import {
  bulkCleanItemTitles,
  createCollectionItem,
} from "@/lib/supabase/queries/items";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import type { Item } from "@/lib/supabase/types/item";

import type { DriveImageFile } from "@/lib/google/drive";

export type SyncDriveFolderInput = {
  collectionId: string;
  collectionName: string;
  company?: string;
  folderUrl: string;
  tags: string[];
  batchMetadata: ItemMetadata;
  onProgress?: (info: SyncProgressInfo) => void;
};

export type SyncProgressInfo = {
  phase: "listing" | "importing" | "done";
  current: number;
  total: number;
  fileName?: string;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
};

type FolderFilesResponse = {
  files: DriveImageFile[];
  titleUpdates?: { itemId: string; fileName: string }[];
  skippedDuplicates: number;
  totalInFolder: number;
  error?: string;
  code?: string;
};

export type SyncDriveFolderResult = {
  imported: Item[];
  updated: Item[];
  skipped: number;
  failed: number;
  errors: string[];
};

export async function syncDriveFolderToCollection(
  input: SyncDriveFolderInput,
): Promise<SyncDriveFolderResult> {
  const progress = input.onProgress;
  progress?.({
    phase: "listing",
    current: 0,
    total: 0,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  });

  const listResponse = await fetch("/api/google-drive/folder-files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collectionId: input.collectionId,
      folderUrl: input.folderUrl,
    }),
  });

  const listPayload = (await listResponse.json()) as FolderFilesResponse;
  if (!listResponse.ok) {
    throw new Error(
      listPayload.error ?? formatSupabaseError({ message: "Failed to list files" }),
    );
  }

  const files = listPayload.files ?? [];
  const skipped = listPayload.skippedDuplicates ?? 0;
  const imported: Item[] = [];
  const errors: string[] = [];
  let failed = 0;

  const supabase = createBrowserClientInstance();

  const titleUpdates = listPayload.titleUpdates ?? [];
  let updated: Item[] = [];
  if (titleUpdates.length > 0) {
    const driveFileNameByItemId = Object.fromEntries(
      titleUpdates.map((row) => [row.itemId, row.fileName]),
    );
    const cleanResult = await bulkCleanItemTitles(supabase, {
      itemIds: titleUpdates.map((row) => row.itemId),
      context: {
        collectionName: input.collectionName,
        company: input.company,
      },
      driveFileNameByItemId,
    });
    if (cleanResult.error) {
      errors.push(
        `Title cleanup: ${formatSupabaseError(cleanResult.error)}`,
      );
    } else {
      updated = cleanResult.data ?? [];
    }
  }

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]!;
    progress?.({
      phase: "importing",
      current: index + 1,
      total: files.length,
      fileName: file.name,
      imported: imported.length,
      skipped,
      failed,
      errors,
    });

    try {
      const imageResponse = await fetch(`/api/google-drive/image/${file.id}`);
      if (!imageResponse.ok) {
        const errBody = (await imageResponse.json()) as { error?: string };
        throw new Error(errBody.error ?? imageResponse.statusText);
      }

      const blob = await imageResponse.blob();
      const sourceFile = new File([blob], file.name, {
        type: blob.type || file.mimeType || "image/jpeg",
      });
      const thumbnailFile = await compressToWebpThumbnail(sourceFile);
      const { title, file_name } = guessItemTitleFromFileName(
        file.name,
        input.collectionName,
        { company: input.company },
      );
      const metadata = serializeItemMetadata(
        metadataForNewUpload(file_name, input.batchMetadata),
      );

      const { data, error } = await createCollectionItem(supabase, {
        collectionId: input.collectionId,
        imageFile: thumbnailFile,
        title,
        driveUrl: file.webViewLink ?? undefined,
        tags: input.tags,
        metadata,
      });

      if (error || !data) {
        throw new Error(formatSupabaseError(error));
      }

      imported.push(data);
    } catch (cause) {
      failed += 1;
      errors.push(
        `${file.name}: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
  }

  progress?.({
    phase: "done",
    current: files.length,
    total: files.length,
    imported: imported.length,
    skipped,
    failed,
    errors,
  });

  return { imported, updated, skipped, failed, errors };
}