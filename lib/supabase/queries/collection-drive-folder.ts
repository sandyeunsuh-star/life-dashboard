import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseCollectionMetadata,
  serializeCollectionMetadata,
  type CollectionMetadata,
} from "../metadata/collection-schema";
import type { CollectionMetadataRecord } from "../types/collection-metadata";
import { updateCollectionMetadata } from "./collections";

export function mergeCollectionDriveFolderUrl(
  existing: CollectionMetadataRecord | undefined,
  folderUrl: string,
): CollectionMetadataRecord {
  const parsed = parseCollectionMetadata(existing);
  const trimmed = folderUrl.trim();
  const next: CollectionMetadata = {
    ...parsed,
    drive_folder_url: trimmed || parsed.drive_folder_url,
  };
  return serializeCollectionMetadata(next);
}

export async function saveCollectionDriveFolderUrl(
  supabase: SupabaseClient,
  collectionId: string,
  existingMetadata: CollectionMetadataRecord | undefined,
  folderUrl: string,
) {
  const metadata = mergeCollectionDriveFolderUrl(existingMetadata, folderUrl);
  return updateCollectionMetadata(supabase, {
    collectionId,
    metadata,
  });
}