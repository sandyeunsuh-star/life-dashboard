import { METADATA_KEYS, METADATA_SEASONS } from "./constants";

export type ItemMetadata = {
  company?: string;
  collection?: string;
  published?: string;
  designer?: string;
  type?: string;
  file_name?: string;
};

export function parseItemMetadata(
  raw: Record<string, string> | null | undefined,
): ItemMetadata {
  if (!raw) {
    return {};
  }

  return {
    company: raw[METADATA_KEYS.company]?.trim() || undefined,
    collection: raw[METADATA_KEYS.collection]?.trim() || undefined,
    published: raw[METADATA_KEYS.published]?.trim() || undefined,
    designer: raw[METADATA_KEYS.designer]?.trim() || undefined,
    type: raw[METADATA_KEYS.type]?.trim() || undefined,
    file_name: raw[METADATA_KEYS.file_name]?.trim() || undefined,
  };
}

export function serializeItemMetadata(metadata: ItemMetadata): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const trimmed = value?.trim();
    if (trimmed) {
      record[key] = trimmed;
    }
  }
  return record;
}

export function parsePublished(value: string | undefined): {
  season: string;
  year: string;
} {
  if (!value?.trim()) {
    return { season: "", year: "" };
  }

  const match = value.trim().match(/^(\w+)\s+(\d{4})$/);
  if (!match) {
    return { season: "", year: "" };
  }

  const season = match[1]!;
  const year = match[2]!;
  const validSeason = METADATA_SEASONS.includes(
    season as (typeof METADATA_SEASONS)[number],
  )
    ? season
    : "";

  return { season: validSeason, year };
}

export function buildPublished(season: string, year: string): string | undefined {
  if (!season || !year) {
    return undefined;
  }
  return `${season} ${year}`;
}

export function mergeItemMetadata(
  base: ItemMetadata,
  patch: Partial<ItemMetadata>,
): ItemMetadata {
  return {
    ...base,
    ...patch,
  };
}

export function defaultBatchMetadata(
  collectionName: string,
  partial: Partial<ItemMetadata> = {},
): ItemMetadata {
  return {
    collection: collectionName,
    ...partial,
  };
}

export function metadataForNewUpload(
  collectionName: string,
  fileName: string,
  batchDefaults: ItemMetadata,
): ItemMetadata {
  return mergeItemMetadata(batchDefaults, {
    collection: collectionName,
    file_name: fileName,
  });
}