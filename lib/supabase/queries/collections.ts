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

type CollectionWithItemCount = Collection & {
  items: { count: number }[];
};

const DASHBOARD_ITEM_PAGE_SIZE = 1000;
const DASHBOARD_PREVIEW_CONCURRENCY = 12;

/** Paginate through every item row (ids only) — accurate counts above the 1,000-row cap. */
async function fetchItemCountsByCollection(
  supabase: SupabaseClient,
): Promise<{ data: Map<string, number> | null; error: PostgrestError | null }> {
  const counts = new Map<string, number>();

  for (let offset = 0; ; offset += DASHBOARD_ITEM_PAGE_SIZE) {
    const page = await supabase
      .from("items")
      .select("collection_id")
      .order("id", { ascending: true })
      .range(offset, offset + DASHBOARD_ITEM_PAGE_SIZE - 1);

    if (page.error) {
      logSupabaseError("listCollectionsForDashboard item counts", page.error);
      return { data: null, error: page.error };
    }

    const batch = page.data ?? [];
    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      const collectionId = row.collection_id as string;
      counts.set(collectionId, (counts.get(collectionId) ?? 0) + 1);
    }

    if (batch.length < DASHBOARD_ITEM_PAGE_SIZE) {
      break;
    }
  }

  return { data: counts, error: null };
}

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    await Promise.all(slice.map((item) => fn(item)));
  }
}

/** Oldest → newest preview thumbs per collection (at most 4), each query capped at 4 rows. */
async function fetchPreviewThumbnailsByCollection(
  supabase: SupabaseClient,
  collectionIds: string[],
): Promise<{
  data: Map<string, string[]> | null;
  error: PostgrestError | null;
}> {
  const previews = new Map<string, string[]>();
  let firstError: PostgrestError | null = null;

  await runInBatches(collectionIds, DASHBOARD_PREVIEW_CONCURRENCY, async (collectionId) => {
    const { data, error } = await supabase
      .from("items")
      .select("thumbnail_url")
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(4);

    if (error) {
      logSupabaseError("listCollectionsForDashboard previews", error);
      if (!firstError) {
        firstError = error;
      }
      return;
    }

    const urls = (data ?? [])
      .map((row) => row.thumbnail_url?.trim())
      .filter((url): url is string => Boolean(url));

    if (urls.length > 0) {
      previews.set(collectionId, urls);
    }
  });

  if (firstError && previews.size === 0) {
    return { data: null, error: firstError };
  }

  return { data: previews, error: null };
}

function itemCountFromEmbed(items: unknown): number | null {
  if (items == null) {
    return null;
  }
  if (Array.isArray(items) && items.length > 0) {
    const raw = (items[0] as { count?: unknown }).count;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
  }
  if (typeof items === "object" && "count" in (items as object)) {
    const raw = (items as { count: unknown }).count;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
  }
  return null;
}

export async function listCollectionsForDashboard(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const collectionsResult = await supabase
    .from("collections")
    .select(`${COLLECTION_SELECT}, items ( count )`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<CollectionWithItemCount[]>();

  if (collectionsResult.error) {
    logSupabaseError("listCollectionsForDashboard collections", collectionsResult.error);
    return { data: null, error: collectionsResult.error };
  }

  const collections = collectionsResult.data ?? [];
  if (collections.length === 0) {
    return { data: [], error: null };
  }

  const collectionIds = collections.map((row) => row.id);

  const [countsResult, previewsResult] = await Promise.all([
    fetchItemCountsByCollection(supabase),
    fetchPreviewThumbnailsByCollection(supabase, collectionIds),
  ]);

  if (countsResult.error) {
    return { data: null, error: countsResult.error };
  }
  if (previewsResult.error) {
    return { data: null, error: previewsResult.error };
  }

  const countsByCollection = countsResult.data ?? new Map<string, number>();
  const previewsByCollection = previewsResult.data ?? new Map<string, string[]>();

  const summaries: CollectionSummary[] = collections.map((row) => {
    const { items: embeddedItems, ...collectionFields } = row;
    const collection = normalizeCollectionRow(collectionFields);
    const embeddedCount = itemCountFromEmbed(embeddedItems);
    const paginatedCount = countsByCollection.get(collection.id) ?? 0;
    const item_count = Math.max(embeddedCount ?? 0, paginatedCount);

    return {
      ...collection,
      item_count,
      preview_thumbnails: previewsByCollection.get(collection.id) ?? [],
    };
  });

  return { data: summaries, error: null };
}