import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { compressToWebpThumbnail } from "../images/compress-thumbnail";
import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import {
  collectionAssetObjectPath,
  getCollectionAssetPublicUrl,
  uploadCollectionAsset,
} from "../storage/collection-assets";
import type { CreateItemInput, Item, UpdateItemInput } from "../types/item";

export async function listItemDriveUrlsInCollection(
  supabase: SupabaseClient,
  collectionId: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const result = await supabase
    .from("items")
    .select("drive_url")
    .eq("user_id", user.id)
    .eq("collection_id", collectionId)
    .not("drive_url", "is", null);

  if (result.error) {
    logSupabaseError("listItemDriveUrlsInCollection", result.error);
    return result;
  }

  const urls = (result.data ?? [])
    .map((row) => row.drive_url)
    .filter((url): url is string => Boolean(url));

  return { data: urls, error: null };
}

export async function listItemsByCollection(
  supabase: SupabaseClient,
  collectionId: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const result = await supabase
    .from("items")
    .select(
      "id, user_id, collection_id, title, thumbnail_url, drive_url, tags, metadata, created_at",
    )
    .eq("user_id", user.id)
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false })
    .returns<Item[]>();

  if (result.error) {
    logSupabaseError("listItemsByCollection", result.error);
  }

  return result;
}

export async function createCollectionItem(
  supabase: SupabaseClient,
  input: CreateItemInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const title = input.title.trim();
  if (!title) {
    const validationError = {
      message: "Title is required",
      code: "validation_error",
    } as PostgrestError;
    return { data: null, error: validationError };
  }

  let thumbnailFile: File;
  try {
    thumbnailFile = await compressToWebpThumbnail(input.imageFile);
  } catch (cause) {
    logSupabaseError("compressToWebpThumbnail", cause);
    const compressionError = {
      message:
        cause instanceof Error
          ? cause.message
          : "Could not compress image to WebP thumbnail",
      code: "thumbnail_compression_error",
    } as PostgrestError;
    return { data: null, error: compressionError };
  }

  const fileName = `${crypto.randomUUID()}.webp`;
  const objectPath = collectionAssetObjectPath(
    user.id,
    input.collectionId,
    fileName,
  );

  const upload = await uploadCollectionAsset(supabase, objectPath, thumbnailFile);
  if (upload.error) {
    return { data: null, error: upload.error };
  }

  const thumbnailUrl = getCollectionAssetPublicUrl(supabase, objectPath);
  const driveUrl = input.driveUrl?.trim() || null;

  const result = await supabase
    .from("items")
    .insert({
      user_id: user.id,
      collection_id: input.collectionId,
      title,
      thumbnail_url: thumbnailUrl,
      drive_url: driveUrl,
      tags: input.tags,
      metadata: input.metadata,
    })
    .select(
      "id, user_id, collection_id, title, thumbnail_url, drive_url, tags, metadata, created_at",
    )
    .single()
    .returns<Item>();

  if (result.error) {
    logSupabaseError("createCollectionItem", result.error);
    await supabase.storage.from("collection-assets").remove([objectPath]);
  }

  return result;
}

export async function updateCollectionItem(
  supabase: SupabaseClient,
  input: UpdateItemInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const title = input.title.trim();
  if (!title) {
    const validationError = {
      message: "Title is required",
      code: "validation_error",
    } as PostgrestError;
    return { data: null, error: validationError };
  }

  const result = await supabase
    .from("items")
    .update({
      title,
      tags: input.tags,
      metadata: input.metadata,
    })
    .eq("id", input.itemId)
    .eq("user_id", user.id)
    .select(
      "id, user_id, collection_id, title, thumbnail_url, drive_url, tags, metadata, created_at",
    )
    .single()
    .returns<Item>();

  if (result.error) {
    logSupabaseError("updateCollectionItem", result.error);
  }

  return result;
}

export async function listUserItemMetadataRecords(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const result = await supabase
    .from("items")
    .select("metadata")
    .eq("user_id", user.id);

  if (result.error) {
    logSupabaseError("listUserItemMetadataRecords", result.error);
    return result;
  }

  const records = (result.data ?? [])
    .map((row) => row.metadata as Record<string, string>)
    .filter(Boolean);

  return { data: records, error: null };
}

export async function deleteCollectionItem(
  supabase: SupabaseClient,
  itemId: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const result = await supabase
    .from("items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (result.error) {
    logSupabaseError("deleteCollectionItem", result.error);
  }

  return result;
}