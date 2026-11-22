import { METADATA_KEYS, METADATA_SEASONS } from "./constants";

/** Track-level fields; company/designer/published are optional per-item overrides. */
export type ItemMetadata = {
  company?: string;
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

  const trimmed = value.trim();
  const match = trimmed.match(/^(\w+)\s+(\d{4})$/i);
  if (match) {
    const seasonRaw = match[1]!;
    const year = match[2]!;
    const validSeason =
      METADATA_SEASONS.find(
        (season) => season.toLowerCase() === seasonRaw.toLowerCase(),
      ) ?? "";
    return { season: validSeason, year };
  }

  if (/^\d{4}$/.test(trimmed)) {
    return { season: "", year: trimmed };
  }

  const validSeasonOnly =
    METADATA_SEASONS.find(
      (season) => season.toLowerCase() === trimmed.toLowerCase(),
    ) ?? "";
  if (validSeasonOnly) {
    return { season: validSeasonOnly, year: "" };
  }

  return { season: "", year: "" };
}

/** Accepts `"Summer 2016"` or `{ season, year }` from JSONB. */
export function coercePublishedToString(raw: unknown): string | undefined {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed || undefined;
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as { season?: unknown; year?: unknown };
    const season =
      typeof record.season === "string" ? record.season.trim() : "";
    const year =
      typeof record.year === "string"
        ? record.year.trim()
        : typeof record.year === "number" && Number.isFinite(record.year)
          ? String(record.year)
          : "";
    return buildPublished(season, year);
  }

  return undefined;
}

export function buildPublished(season: string, year: string): string | undefined {
  if (season && year) {
    return `${season} ${year}`;
  }
  if (season) {
    return season;
  }
  if (year) {
    return year;
  }
  return undefined;
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

export function defaultTrackBatchMetadata(
  partial: Partial<ItemMetadata> = {},
): ItemMetadata {
  return { ...partial };
}

export function metadataForNewUpload(
  fileName: string,
  batchDefaults: ItemMetadata,
): ItemMetadata {
  return mergeItemMetadata(batchDefaults, {
    file_name: fileName,
  });
}