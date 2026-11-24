import type { SupabaseClient } from "@supabase/supabase-js";

import { logSupabaseError } from "../errors";
import { SUPABASE_STORAGE_CACHE_CONTROL } from "./cache-control";

export const VAULT_IMAGES_BUCKET = "vault-images";

function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 5) {
    return fromName;
  }
  const subtype = file.type.split("/")[1];
  if (subtype === "jpeg") return "jpg";
  if (subtype && /^[a-z0-9.+]+$/.test(subtype)) {
    return subtype.replace("svg+xml", "svg");
  }
  return "webp";
}

export function vaultImageObjectPath(
  userId: string,
  fileId: string,
  file: File,
) {
  return `${userId}/${fileId}.${fileExtension(file)}`;
}

export async function uploadVaultImage(
  supabase: SupabaseClient,
  objectPath: string,
  file: File,
) {
  const result = await supabase.storage
    .from(VAULT_IMAGES_BUCKET)
    .upload(objectPath, file, {
      contentType: file.type || "image/jpeg",
      cacheControl: SUPABASE_STORAGE_CACHE_CONTROL,
      upsert: true,
    });

  if (result.error) {
    logSupabaseError("uploadVaultImage", result.error);
  }

  return result;
}

export function getVaultImagePublicUrl(
  supabase: SupabaseClient,
  objectPath: string,
) {
  const { data } = supabase.storage
    .from(VAULT_IMAGES_BUCKET)
    .getPublicUrl(objectPath);

  return data.publicUrl;
}

export async function uploadVaultImageFromFile(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  options?: { vaultItemId?: string },
) {
  const fileId = options?.vaultItemId ?? crypto.randomUUID();
  const objectPath = vaultImageObjectPath(userId, fileId, file);
  const upload = await uploadVaultImage(supabase, objectPath, file);
  if (upload.error) {
    return { publicUrl: null as string | null, error: upload.error };
  }
  return {
    publicUrl: getVaultImagePublicUrl(supabase, objectPath),
    error: null,
  };
}