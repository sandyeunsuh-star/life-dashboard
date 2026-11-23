import type { SupabaseClient } from "@supabase/supabase-js";

import { logSupabaseError } from "../errors";
import { SUPABASE_STORAGE_CACHE_CONTROL } from "./cache-control";

export const SEWING_PATTERNS_BUCKET = "sewing-patterns";

const SIGNED_URL_TTL_SEC = 60 * 60;

export function sewingCoverPath(userId: string, fileId: string) {
  return `${userId}/covers/${fileId}.webp`;
}

export function sewingInstructionsPdfPath(userId: string, fileId: string) {
  return `${userId}/instructions/${fileId}.pdf`;
}

export function sewingPatternPdfPath(userId: string, fileId: string) {
  return `${userId}/patterns/${fileId}.pdf`;
}

export async function uploadSewingObject(
  supabase: SupabaseClient,
  objectPath: string,
  file: File | Blob,
  contentType: string,
  options?: { upsert?: boolean },
) {
  const result = await supabase.storage
    .from(SEWING_PATTERNS_BUCKET)
    .upload(objectPath, file, {
      contentType,
      cacheControl: SUPABASE_STORAGE_CACHE_CONTROL,
      upsert: options?.upsert ?? true,
    });

  if (result.error) {
    logSupabaseError("uploadSewingObject", result.error);
  }

  return result;
}

export async function removeSewingObject(
  supabase: SupabaseClient,
  objectPath: string,
) {
  const { error } = await supabase.storage
    .from(SEWING_PATTERNS_BUCKET)
    .remove([objectPath]);

  if (error) {
    logSupabaseError("removeSewingObject", error);
  }

  return { error };
}

export async function createSewingSignedUrl(
  supabase: SupabaseClient,
  objectPath: string,
  expiresIn = SIGNED_URL_TTL_SEC,
) {
  const { data, error } = await supabase.storage
    .from(SEWING_PATTERNS_BUCKET)
    .createSignedUrl(objectPath, expiresIn);

  if (error) {
    logSupabaseError("createSewingSignedUrl", error);
    return { url: null, error };
  }

  return { url: data.signedUrl, error: null };
}