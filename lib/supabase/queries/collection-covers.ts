import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { compressToWebpCover } from "../images/compress-cover";
import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import {
  collectionCoverObjectPath,
  getCollectionAssetPublicUrl,
  uploadCollectionAsset,
} from "../storage/collection-assets";
import type { CollectionMetadataRecord } from "../types/collection-metadata";
import type { Collection } from "../types/collection";

function normalizeCollectionRow(row: Collection): Collection {
  return {
    ...row,
    metadata: (row.metadata ?? {}) as CollectionMetadataRecord,
    cover_image_url: row.cover_image_url ?? null,
  };
}

export async function setCollectionCoverImageUrl(
  supabase: SupabaseClient,
  collectionId: string,
  coverImageUrl: string | null,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const result = await supabase
    .from("collections")
    .update({ cover_image_url: coverImageUrl })
    .eq("id", collectionId)
    .eq("user_id", user.id)
    .select(
      "id, user_id, name, description, slug, metadata, cover_image_url, created_at",
    )
    .single()
    .returns<Collection>();

  if (result.error) {
    logSupabaseError("setCollectionCoverImageUrl", result.error);
  }

  if (result.data) {
    return { ...result, data: normalizeCollectionRow(result.data) };
  }

  return result;
}

export async function uploadCollectionCoverFromFile(
  supabase: SupabaseClient,
  collectionId: string,
  imageFile: File,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  let coverFile: File;
  try {
    coverFile = await compressToWebpCover(imageFile);
  } catch (cause) {
    const compressionError = {
      message:
        cause instanceof Error
          ? cause.message
          : "Could not compress image to WebP cover",
      code: "cover_compression_error",
    } as PostgrestError;
    return { data: null, error: compressionError };
  }

  const objectPath = collectionCoverObjectPath(user.id, collectionId);
  const upload = await uploadCollectionAsset(supabase, objectPath, coverFile, {
    upsert: true,
  });

  if (upload.error) {
    return { data: null, error: upload.error };
  }

  const coverImageUrl = getCollectionAssetPublicUrl(supabase, objectPath);
  return setCollectionCoverImageUrl(supabase, collectionId, coverImageUrl);
}