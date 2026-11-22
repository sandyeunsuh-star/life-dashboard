import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import { slugifyName } from "../slug";
import {
  mergeCollectionMetadataForSave,
  normalizeCollectionMetadata,
  serializeCollectionMetadata,
} from "../metadata/collection-schema";
import type { CollectionMetadata } from "../metadata/collection-schema";
import type { CollectionMetadataRecord } from "../types/collection-metadata";
import type {
  Collection,
  CollectionSummary,
  CreateCollectionInput,
  UpdateCollectionInput,
  UpdateCollectionMetadataInput,
} from "../types/collection";

const COLLECTION_SELECT =
  "id, user_id, name, description, slug, metadata, cover_image_url, created_at";

function normalizeCollectionRow(row: Collection): Collection {
  return {
    ...row,
    metadata: (row.metadata ?? {}) as CollectionMetadataRecord,
    cover_image_url: row.cover_image_url ?? null,
  };
}

async function resolveUniqueSlug(
  supabase: SupabaseClient,
  userId: string,
  name: string,
): Promise<{ slug: string; error: PostgrestError | null }> {
  const base = slugifyName(name);
  let slug = base;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from("collections")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      logSupabaseError("resolveUniqueSlug", error);
      return { slug: "", error };
    }

    if (!data) {
      return { slug, error: null };
    }

    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function listCollections(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const result = await supabase
    .from("collections")
    .select(COLLECTION_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Collection[]>();

  if (result.error) {
    logSupabaseError("listCollections", result.error);
  }

  if (result.data) {
    return { ...result, data: result.data.map(normalizeCollectionRow) };
  }

  return result;
}

export async function getCollectionBySlug(
  supabase: SupabaseClient,
  slug: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const result = await supabase
    .from("collections")
    .select(COLLECTION_SELECT)
    .eq("user_id", user.id)
    .eq("slug", slug)
    .maybeSingle()
    .returns<Collection>();

  if (result.error) {
    logSupabaseError("getCollectionBySlug", result.error);
  }

  if (result.data) {
    return { ...result, data: normalizeCollectionRow(result.data) };
  }

  return result;
}

export async function createCollection(
  supabase: SupabaseClient,
  input: CreateCollectionInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const name = input.name.trim();
  if (!name) {
    const validationError = {
      message: "Name is required",
      code: "validation_error",
    } as PostgrestError;
    return { data: null, error: validationError };
  }

  const { slug, error: slugError } = await resolveUniqueSlug(
    supabase,
    user.id,
    name,
  );
  if (slugError) {
    return { data: null, error: slugError };
  }

  const description = input.description?.trim() || null;
  const metadata = input.metadata ?? {};

  const result = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      name,
      description,
      slug,
      metadata,
    })
    .select(COLLECTION_SELECT)
    .single()
    .returns<Collection>();

  if (result.error) {
    logSupabaseError("createCollection", result.error);
  }

  if (result.data) {
    return { ...result, data: normalizeCollectionRow(result.data) };
  }

  return result;
}

export async function updateCollection(
  supabase: SupabaseClient,
  input: UpdateCollectionInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const name = input.name.trim();
  if (!name) {
    const validationError = {
      message: "Name is required",
      code: "validation_error",
    } as PostgrestError;
    return { data: null, error: validationError };
  }

  const description = input.description?.trim() || null;

  const updatePayload: {
    name: string;
    description: string | null;
    cover_image_url?: string | null;
    metadata?: CollectionMetadataRecord;
  } = { name, description };

  if (input.cover_image_url !== undefined) {
    updatePayload.cover_image_url = input.cover_image_url;
  }
  if (input.metadata !== undefined) {
    updatePayload.metadata = input.metadata;
  }

  const result = await supabase
    .from("collections")
    .update(updatePayload)
    .eq("id", input.collectionId)
    .eq("user_id", user.id)
    .select(COLLECTION_SELECT)
    .single()
    .returns<Collection>();

  if (result.error) {
    logSupabaseError("updateCollection", result.error);
  }

  if (result.data) {
    return { ...result, data: normalizeCollectionRow(result.data) };
  }

  return result;
}

export async function updateCollectionMetadata(
  supabase: SupabaseClient,
  input: UpdateCollectionMetadataInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const result = await supabase
    .from("collections")
    .update({ metadata: input.metadata })
    .eq("id", input.collectionId)
    .eq("user_id", user.id)
    .select(COLLECTION_SELECT)
    .single()
    .returns<Collection>();

  if (result.error) {
    logSupabaseError("updateCollectionMetadata", result.error);
  }

  if (result.data) {
    return { ...result, data: normalizeCollectionRow(result.data) };
  }

  return result;
}

export async function listUserCollectionMetadataRecords(
  supabase: SupabaseClient,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const result = await supabase
    .from("collections")
    .select("metadata")
    .eq("user_id", user.id);

  if (result.error) {
    logSupabaseError("listUserCollectionMetadataRecords", result.error);
    return result;
  }

  const records = (result.data ?? [])
    .map((row) => row.metadata as CollectionMetadataRecord)
    .filter(Boolean);

  return { data: records, error: null };
}

export function collectionMetadataInputToRecord(
  metadata: CollectionMetadata,
  existing?: CollectionMetadataRecord | null,
): CollectionMetadataRecord {
  if (existing) {
    return mergeCollectionMetadataForSave(existing, metadata);
  }
  return serializeCollectionMetadata(normalizeCollectionMetadata(metadata));
}

export async function listCollectionsForDashboard(supabase: SupabaseClient) {
  const { data: collections, error } = await listCollections(supabase);
  if (error || !collections) {
    return { data: null, error };
  }

  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const itemsResult = await supabase
    .from("items")
    .select("collection_id, thumbnail_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (itemsResult.error) {
    logSupabaseError("listCollectionsForDashboard items", itemsResult.error);
    return { data: null, error: itemsResult.error };
  }

  const counts = new Map<string, number>();
  const previews = new Map<string, string[]>();

  for (const row of itemsResult.data ?? []) {
    const collectionId = row.collection_id as string;
    counts.set(collectionId, (counts.get(collectionId) ?? 0) + 1);

    const thumbs = previews.get(collectionId) ?? [];
    const url = row.thumbnail_url as string | null;
    if (url && thumbs.length < 4) {
      thumbs.push(url);
      previews.set(collectionId, thumbs);
    }
  }

  const summaries: CollectionSummary[] = collections.map((collection) => ({
    ...collection,
    item_count: counts.get(collection.id) ?? 0,
    preview_thumbnails: previews.get(collection.id) ?? [],
  }));

  return { data: summaries, error: null };
}