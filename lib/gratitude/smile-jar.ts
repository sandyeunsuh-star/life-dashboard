import type {
  GratitudeEntryRow,
  GratitudeMemoryPick,
} from "@/lib/supabase/types/gratitude";

type MemoryCandidate = GratitudeMemoryPick;

function candidatesFromEntry(entry: GratitudeEntryRow): MemoryCandidate[] {
  const out: MemoryCandidate[] = [];
  if (entry.favorite_thing?.trim()) {
    out.push({
      entryId: entry.id,
      entryDate: entry.entry_date,
      label: entry.favorite_thing.trim(),
      photoUrl: entry.favorite_photo_url?.trim() || null,
      source: "favorite",
    });
  }
  for (const text of [entry.glimmer_1, entry.glimmer_2, entry.glimmer_3]) {
    const trimmed = text?.trim();
    if (trimmed) {
      out.push({
        entryId: entry.id,
        entryDate: entry.entry_date,
        label: trimmed,
        photoUrl: null,
        source: "glimmer",
      });
    }
  }
  return out;
}

export function buildGratitudeMemoryPool(
  entries: GratitudeEntryRow[],
  options?: { excludeEntryDate?: string },
): MemoryCandidate[] {
  const pool: MemoryCandidate[] = [];
  for (const entry of entries) {
    if (
      options?.excludeEntryDate &&
      entry.entry_date === options.excludeEntryDate
    ) {
      continue;
    }
    pool.push(...candidatesFromEntry(entry));
  }
  return pool;
}

export function pickRandomGratitudeMemory(
  entries: GratitudeEntryRow[],
  options?: { excludeEntryDate?: string; seed?: string },
): GratitudeMemoryPick | null {
  const pool = buildGratitudeMemoryPool(entries, options);
  if (pool.length === 0) return null;
  if (options?.seed) {
    let hash = 0;
    for (let i = 0; i < options.seed.length; i += 1) {
      hash = (hash * 31 + options.seed.charCodeAt(i)) | 0;
    }
    const index = Math.abs(hash) % pool.length;
    return pool[index] ?? null;
  }
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? null;
}