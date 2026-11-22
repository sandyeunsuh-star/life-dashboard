import { dedupeTrimmedStrings } from "./dedupe-strings";
import { guessItemTitleFromFileName } from "./metadata/title-from-filename";

/** Derive a human-friendly title from an uploaded file name. */
export function titleFromFileName(fileName: string): string {
  return guessItemTitleFromFileName(fileName, "").title;
}

export function parseTagsInput(raw: string): string[] {
  return dedupeTrimmedStrings(
    raw.split(",").map((tag) => tag.trim()),
  );
}

export function metadataRowsToRecord(
  rows: { key: string; value: string }[],
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    const value = row.value.trim();
    if (key && value) {
      record[key] = value;
    }
  }
  return record;
}