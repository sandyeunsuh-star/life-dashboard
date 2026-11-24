import type { SupabaseClient } from "@supabase/supabase-js";

import { logSupabaseError } from "../errors";
import { SUPABASE_STORAGE_CACHE_CONTROL } from "./cache-control";

export const TIDY_REWARDS_BUCKET = "tidy-rewards";

export function tidyRewardImagePath(userId: string, fileId: string) {
  return `${userId}/${fileId}.webp`;
}

export async function uploadTidyRewardImage(
  supabase: SupabaseClient,
  objectPath: string,
  file: File | Blob,
) {
  const body =
    file instanceof File
      ? file
      : new File([file], "reward.webp", { type: "image/webp" });

  const result = await supabase.storage
    .from(TIDY_REWARDS_BUCKET)
    .upload(objectPath, body, {
      contentType: "image/webp",
      cacheControl: SUPABASE_STORAGE_CACHE_CONTROL,
      upsert: true,
    });

  if (result.error) {
    logSupabaseError("uploadTidyRewardImage", result.error);
  }

  return result;
}

export function getTidyRewardPublicUrl(
  supabase: SupabaseClient,
  objectPath: string,
) {
  const { data } = supabase.storage
    .from(TIDY_REWARDS_BUCKET)
    .getPublicUrl(objectPath);

  return data.publicUrl;
}