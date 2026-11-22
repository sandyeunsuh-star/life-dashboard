import type { SupabaseClient } from "@supabase/supabase-js";

import { logSupabaseError } from "../errors";

export const COLLECTION_ASSETS_BUCKET = "collection-assets";

export function collectionAssetObjectPath(
  userId: string,
  collectionId: string,
  fileName: string,
) {
  return `${userId}/${collectionId}/${fileName}`;
}

export async function uploadCollectionAsset(
  supabase: SupabaseClient,
  objectPath: string,
  file: File,
) {
  const result = await supabase.storage
    .from(COLLECTION_ASSETS_BUCKET)
    .upload(objectPath, file, {
      contentType: file.type || "image/webp",
      cacheControl: "3600",
      upsert: false,
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