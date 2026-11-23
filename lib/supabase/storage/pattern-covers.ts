import type { SupabaseClient } from "@supabase/supabase-js";

import { logSupabaseError } from "../errors";
import {
  COLLECTION_ASSETS_BUCKET,
  getCollectionAssetPublicUrl,
  uploadCollectionAsset,
} from "./collection-assets";
import {
  createKnittingSignedUrl,
  KNITTING_PATTERNS_BUCKET,
  removeKnittingObject,
} from "./knitting-patterns";
import {
  createSewingSignedUrl,
  removeSewingObject,
  SEWING_PATTERNS_BUCKET,
} from "./sewing-patterns";
import { clearCachedSignedUrl, getCachedSignedUrl } from "./signed-url-cache";

const SIGNED_URL_TTL_SEC = 60 * 60;

export function knittingCoverStoragePath(userId: string, fileId: string) {
  return `${userId}/knitting-covers/${fileId}.webp`;
}

export function sewingCoverStoragePath(userId: string, fileId: string) {
  return `${userId}/sewing-covers/${fileId}.webp`;
}

/** Covers stored in public `collection-assets` (stable URLs + long browser cache). */
export function isPublicPatternCoverPath(objectPath: string): boolean {
  return (
    objectPath.includes("/knitting-covers/") ||
    objectPath.includes("/sewing-covers/")
  );
}

function isLegacyKnittingPrivateCover(objectPath: string): boolean {
  return objectPath.includes("/thumbnails/");
}

function isLegacySewingPrivateCover(objectPath: string): boolean {
  return (
    objectPath.includes("/covers/") && !objectPath.includes("/sewing-covers/")
  );
}

export async function uploadPatternCover(
  supabase: SupabaseClient,
  objectPath: string,
  file: File | Blob,
) {
  const body =
    file instanceof File
      ? file
      : new File([file], "cover.webp", { type: "image/webp" });
  return uploadCollectionAsset(supabase, objectPath, body, { upsert: true });
}

export async function removePatternCover(
  supabase: SupabaseClient,
  coverPath: string | null | undefined,
) {
  if (!coverPath?.trim()) {
    return { error: null };
  }

  if (isPublicPatternCoverPath(coverPath)) {
    const { error } = await supabase.storage
      .from(COLLECTION_ASSETS_BUCKET)
      .remove([coverPath]);
    if (error) {
      logSupabaseError("removePatternCover public", error);
    }
    return { error };
  }

  if (isLegacyKnittingPrivateCover(coverPath)) {
    return removeKnittingObject(supabase, coverPath);
  }

  if (isLegacySewingPrivateCover(coverPath)) {
    return removeSewingObject(supabase, coverPath);
  }

  return { error: null };
}

export async function resolveKnittingCoverUrl(
  supabase: SupabaseClient,
  coverPath: string | null | undefined,
): Promise<string | null> {
  if (!coverPath?.trim()) {
    return null;
  }

  if (isPublicPatternCoverPath(coverPath)) {
    return getCollectionAssetPublicUrl(supabase, coverPath);
  }

  return getCachedSignedUrl(
    `${KNITTING_PATTERNS_BUCKET}:${coverPath}`,
    () => createKnittingSignedUrl(supabase, coverPath, SIGNED_URL_TTL_SEC),
    SIGNED_URL_TTL_SEC,
  );
}

export async function resolveSewingCoverUrl(
  supabase: SupabaseClient,
  coverPath: string | null | undefined,
): Promise<string | null> {
  if (!coverPath?.trim()) {
    return null;
  }

  if (isPublicPatternCoverPath(coverPath)) {
    return getCollectionAssetPublicUrl(supabase, coverPath);
  }

  return getCachedSignedUrl(
    `${SEWING_PATTERNS_BUCKET}:${coverPath}`,
    () => createSewingSignedUrl(supabase, coverPath, SIGNED_URL_TTL_SEC),
    SIGNED_URL_TTL_SEC,
  );
}

export function invalidateKnittingCoverUrlCache(
  coverPath: string | null | undefined,
) {
  if (!coverPath?.trim()) return;
  clearCachedSignedUrl(`${KNITTING_PATTERNS_BUCKET}:${coverPath}`);
}

export function invalidateSewingCoverUrlCache(
  coverPath: string | null | undefined,
) {
  if (!coverPath?.trim()) return;
  clearCachedSignedUrl(`${SEWING_PATTERNS_BUCKET}:${coverPath}`);
}