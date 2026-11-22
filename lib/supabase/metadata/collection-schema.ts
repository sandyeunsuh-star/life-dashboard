import { METADATA_KEYS } from "./constants";
import { dedupePalette, parsePaletteFromMetadata } from "./palette";
import { buildPublished, coercePublishedToString, parsePublished } from "./schema";
import type { CollectionMetadataRecord } from "../types/collection-metadata";

export type CollectionMetadata = {
  company?: string;
  designer?: string;
  published?: string;
  palette?: string[];
  drive_folder_url?: string;
};

export function parseCollectionMetadata(
  raw: CollectionMetadataRecord | null | undefined,
): CollectionMetadata {
  if (!raw) {
    return {};
  }

  const company = raw[METADATA_KEYS.company];
  const designer = raw[METADATA_KEYS.designer];
  const publishedRaw = raw[METADATA_KEYS.published];
  const driveFolder = raw[METADATA_KEYS.drive_folder_url];

  return {
    company:
      typeof company === "string" ? company.trim() || undefined : undefined,
    designer:
      typeof designer === "string" ? designer.trim() || undefined : undefined,
    published: coercePublishedToString(publishedRaw),
    palette: parsePaletteFromMetadata(raw[METADATA_KEYS.palette]),
    drive_folder_url:
      typeof driveFolder === "string"
        ? driveFolder.trim() || undefined
        : undefined,
  };
}

export function normalizeCollectionMetadata(
  metadata: CollectionMetadata,
): CollectionMetadata {
  return {
    company: metadata.company?.trim() || undefined,
    designer: metadata.designer?.trim() || undefined,
    published: metadata.published?.trim() || undefined,
    palette: metadata.palette?.length
      ? dedupePalette(metadata.palette)
      : undefined,
    drive_folder_url: metadata.drive_folder_url?.trim() || undefined,
  };
}

export function serializeCollectionMetadata(
  metadata: CollectionMetadata,
): CollectionMetadataRecord {
  const normalized = normalizeCollectionMetadata(metadata);
  const record: CollectionMetadataRecord = {};

  if (normalized.company) {
    record[METADATA_KEYS.company] = normalized.company;
  }
  if (normalized.designer) {
    record[METADATA_KEYS.designer] = normalized.designer;
  }
  if (normalized.published) {
    record[METADATA_KEYS.published] = normalized.published;
  }
  if (normalized.palette?.length) {
    record[METADATA_KEYS.palette] = normalized.palette;
  }
  if (normalized.drive_folder_url) {
    record[METADATA_KEYS.drive_folder_url] = normalized.drive_folder_url;
  }

  return record;
}

const ALBUM_MANAGED_METADATA_KEYS = [
  METADATA_KEYS.company,
  METADATA_KEYS.designer,
  METADATA_KEYS.published,
  METADATA_KEYS.palette,
  METADATA_KEYS.drive_folder_url,
] as const;

/** Preserves unknown JSONB keys while replacing album fields from the form. */
export function mergeCollectionMetadataForSave(
  existing: CollectionMetadataRecord | null | undefined,
  form: CollectionMetadata,
): CollectionMetadataRecord {
  const next = serializeCollectionMetadata(normalizeCollectionMetadata(form));
  const merged: CollectionMetadataRecord = { ...(existing ?? {}) };

  for (const key of ALBUM_MANAGED_METADATA_KEYS) {
    if (key in next) {
      merged[key] = next[key]!;
    } else {
      delete merged[key];
    }
  }

  return merged;
}

export { buildPublished, parsePublished };