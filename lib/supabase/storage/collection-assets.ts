import type { SupabaseClient } from "@supabase/supabase-js";

import { logSupabaseError } from "../errors";
import { SUPABASE_STORAGE_CACHE_CONTROL } from "./cache-control";

export const COLLECTION_ASSETS_BUCKET = "collection-assets";

export function collectionAssetObjectPath(
  userId: string,
  collectionId: string,
  fileName: string,
) {
  return `${userId}/${collectionId}/${fileName}`;
}

export function collectionCoverObjectPath(userId: string, collectionId: string) {
  return `${userId}/covers/${collectionId}.webp`;
}

export async function uploadCollectionAsset(
  supabase: SupabaseClient,
  objectPath: string,
  file: File,
  options?: { upsert?: boolean },
) {
  const result = await supabase.storage
    .from(COLLECTION_ASSETS_BUCKET)
    .upload(objectPath, file, {
      contentType: file.type || "image/webp",
      cacheControl: SUPABASE_STORAGE_CACHE_CONTROL,
      upsert: options?.upsert ?? false,
    });

  if (result.error) {
    logSupabaseError("uploadCollectionAsset", result.error);
  }

  return result;
}

export function getCollectionAssetPublicUrl(
  supabase: SupabaseClient,
  objectPath: string,
) {
  const { data } = supabase.storage
    .from(COLLECTION_ASSETS_BUCKET)
    .getPublicUrl(objectPath);

  return data.publicUrl;
}