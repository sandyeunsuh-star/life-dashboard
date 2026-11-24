import { extractGoogleDriveFileId } from "@/lib/google/drive-url";

const META_FULL_KEYS = [
  "image_url",
  "full_url",
  "original_url",
  "file_url",
] as const;

function metadataFullImageUrl(
  metadata: Record<string, string> | null | undefined,
): string | null {
  if (!metadata) return null;
  for (const key of META_FULL_KEYS) {
    const value = metadata[key]?.trim();
    if (value) return value;
  }
  return null;
}

/** Small WebP stored on `items.thumbnail_url` (Creative Room grid / swatches). */
export function itemThumbUrl(
  thumbnailUrl: string | null | undefined,
): string | null {
  const trimmed = thumbnailUrl?.trim();
  return trimmed || null;
}

/**
 * Best available full-bleed URL for an item: metadata full URL, Google Drive
 * proxy (`/api/google-drive/image/...`), else thumbnail.
 */
export function itemFullImageUrl(input: {
  thumbnail_url?: string | null;
  drive_url?: string | null;
  metadata?: Record<string, string> | null;
}): string | null {
  const thumb = itemThumbUrl(input.thumbnail_url);
  const fromMeta = metadataFullImageUrl(input.metadata);
  if (fromMeta) return fromMeta;

  const fileId = extractGoogleDriveFileId(input.drive_url);
  if (fileId) {
    return `/api/google-drive/image/${fileId}`;
  }

  return thumb;
}