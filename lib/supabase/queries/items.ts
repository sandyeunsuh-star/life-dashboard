import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { compressToWebpThumbnail } from "../images/compress-thumbnail";
import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import {
  collectionAssetObjectPath,
  getCollectionAssetPublicUrl,
  uploadCollectionAsset,
} from "../storage/collection-assets";
import { dedupeTrimmedStrings } from "../dedupe-strings";
import {
  computeCleanedItemFields,
  type CleanItemTitleContext,
} from "../metadata/clean-item-title";
import { parseItemMetadata, serializeItemMetadata } from "../metadata/schema";
import type {
  BulkUpdateItemsInput,
  CreateItemInput,
  Item,
  UpdateItemInput,
} from "../types/item";

export type DriveFolderSyncItem = Pick<
  Item,
  "id" | "title" | "drive_url" | "metadata"
>;

export async function listItemsForDriveFolderSync(
  supabase: SupabaseClient,
  collectionId: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const result = await supabase
    .from("items")
    .select("id, title, drive_url, metadata")
    .eq("user_id", user.id)
    .eq("collection_id", collectionId)
    .returns<DriveFolderSyncItem[]>();

  if (result.error) {
    logSupabaseError("listItemsForDriveFolderSync", result.error);
  }

  return result;
}

export async function bulkCleanItemTitles(
  supabase: SupabaseClient,
  input: {
    itemIds: string[];
    context: CleanItemTitleContext;
    driveFileNameByItemId?: Record<string, string>;
  },
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, cleanedCount: 0, error: authError };
  }

  if (input.itemIds.length === 0) {
    return { data: [], cleanedCount: 0, error: null };
  }

  const { data: rows, error: fetchError } = await supabase
    .from("items")
    .select(
      "id, user_id, collection_id, title, thumbnail_url, drive_url, tags, metadata, created_at",
    )
    .eq("user_id", user.id)
    .in("id", input.itemIds)
    .returns<Item[]>();

  if (fetchError) {
    logSupabaseError("bulkCleanItemTitles fetch", fetchError);
    return { data: null, cleanedCount: 0, error: fetchError };
  }

  const updateResults = await Promise.all(
    (rows ?? []).map(async (item) => {
      const driveFileName = input.driveFileNameByItemId?.[item.id];
      const { title, metadata, changed } = computeCleanedItemFields(
        item,
        input.context,
        driveFileName,
      );

      if (!changed) {
        return { item: null as Item | null, error: null as PostgrestError | null };
      }

      const result = await supabase
        .from("items")
        .update({ title, metadata })
        .eq("id", item.id)
        .eq("user_id", user.id)
        .select(
          "id, user_id, collection_id, title, thumbnail_url, drive_url, tags, metadata, created_at",
        )
        .single()
        .returns<Item>();

      if (result.error) {
        logSupabaseError("bulkCleanItemTitles update", result.error);
      }

      return { item: result.data ?? null, error: result.error };
    }),
  );

  const firstError = updateResults.find((row) => row.error)?.error ?? null;
  const updated = updateResults
    .map((row) => row.item)
    .filter((item): item is Item => Boolean(item));

  return {
    data: updated,
    cleanedCount: updated.length,
    error: firstError,
  };
}

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
      tags: dedupeTrimmedStrings(input.tags),
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

  const driveUrl =
    input.driveUrl === undefined
      ? undefined
      : input.driveUrl?.trim() || null;

  const result = await supabase
    .from("items")
    .update({
      title,
      tags: dedupeTrimmedStrings(input.tags),
      metadata: input.metadata,
      ...(driveUrl !== undefined ? { drive_url: driveUrl } : {}),
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

export async function bulkUpdateCollectionItems(
  supabase: SupabaseClient,
  input: BulkUpdateItemsInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  if (input.itemIds.length === 0) {
    return { data: [], error: null };
  }

  const { data: rows, error: fetchError } = await supabase
    .from("items")
    .select(
      "id, user_id, collection_id, title, thumbnail_url, drive_url, tags, metadata, created_at",
    )
    .eq("user_id", user.id)
    .in("id", input.itemIds)
    .returns<Item[]>();

  if (fetchError) {
    logSupabaseError("bulkUpdateCollectionItems fetch", fetchError);
    return { data: null, error: fetchError };
  }

  const updated: Item[] = [];

  for (const item of rows ?? []) {
    const meta = parseItemMetadata(item.metadata);

    if (input.applyType) {
      meta.type = input.type?.trim() || undefined;
    }
    if (input.applyCompany) {
      meta.company = input.company?.trim() || undefined;
    }
    if (input.applyDesigner) {
      meta.designer = input.designer?.trim() || undefined;
    }
    if (input.applyPublished) {
      meta.published = input.published?.trim() || undefined;
    }

    let tags = [...(item.tags ?? [])];
    if (input.applyTagsReplace) {
      tags = dedupeTrimmedStrings(input.tagsReplace);
    }
    if (input.applyTagsAdd) {
      tags = dedupeTrimmedStrings([
        ...tags,
        ...input.tagsToAdd.map((tag) => tag.trim()),
      ]);
    } else if (!input.applyTagsReplace) {
      tags = dedupeTrimmedStrings(tags);
    }

    const metadataRecord = serializeItemMetadata(meta);

    const { data: saved, error: updateError } = await supabase
      .from("items")
      .update({ tags, metadata: metadataRecord })
      .eq("id", item.id)
      .eq("user_id", user.id)
      .select(
        "id, user_id, collection_id, title, thumbnail_url, drive_url, tags, metadata, created_at",
      )
      .single()
      .returns<Item>();

    if (updateError) {
      logSupabaseError("bulkUpdateCollectionItems update", updateError);
      return { data: null, error: updateError };
    }

    if (saved) {
      updated.push(saved);
    }
  }

  return { data: updated, error: null };
}

export async function deleteCollectionItems(
  supabase: SupabaseClient,
  itemIds: string[],
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  if (itemIds.length === 0) {
    return { data: true, error: null };
  }

  const result = await supabase
    .from("items")
    .delete()
    .eq("user_id", user.id)
    .in("id", itemIds);

  if (result.error) {
    logSupabaseError("deleteCollectionItems", result.error);
  }

  return result;
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