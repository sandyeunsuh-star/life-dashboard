import type { SupabaseClient } from "@supabase/supabase-js";

import { logSupabaseError } from "../errors";
import { SUPABASE_STORAGE_CACHE_CONTROL } from "./cache-control";

export const KNITTING_PATTERNS_BUCKET = "knitting-patterns";

const SIGNED_URL_TTL_SEC = 60 * 60;

export function knittingThumbnailPath(userId: string, fileId: string) {
  return `${userId}/thumbnails/${fileId}.webp`;
}

export function knittingPdfPath(userId: string, fileId: string) {
  return `${userId}/pdfs/${fileId}.pdf`;
}

export async function uploadKnittingObject(
  supabase: SupabaseClient,
  objectPath: string,
  file: File | Blob,
  contentType: string,
  options?: { upsert?: boolean },
) {
  const result = await supabase.storage
    .from(KNITTING_PATTERNS_BUCKET)
    .upload(objectPath, file, {
      contentType,
      cacheControl: SUPABASE_STORAGE_CACHE_CONTROL,
      upsert: options?.upsert ?? true,
    });

  if (result.error) {
    logSupabaseError("uploadKnittingObject", result.error);
  }

  return result;
}

export async function removeKnittingObject(
  supabase: SupabaseClient,
  objectPath: string,
) {
  const { error } = await supabase.storage
    .from(KNITTING_PATTERNS_BUCKET)
    .remove([objectPath]);

  if (error) {
    logSupabaseError("removeKnittingObject", error);
  }

  return { error };
}

export async function createKnittingSignedUrl(
  supabase: SupabaseClient,
  objectPath: string,
  expiresIn = SIGNED_URL_TTL_SEC,
) {
  const { data, error } = await supabase.storage
    .from(KNITTING_PATTERNS_BUCKET)
    .createSignedUrl(objectPath, expiresIn);

  if (error) {
    logSupabaseError("createKnittingSignedUrl", error);
    return { url: null, error };
  }

  return { url: data.signedUrl, error: null };
}