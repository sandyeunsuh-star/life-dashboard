import {
  parseItemMetadata,
  serializeItemMetadata,
  type ItemMetadata,
} from "./schema";
import { guessItemTitleFromFileName } from "./title-from-filename";
import type { Item } from "../types/item";

export type CleanItemTitleContext = {
  collectionName: string;
  company?: string;
};

/** Best-effort raw filename stem for cleaning (preserves originals in metadata). */
type ItemTitleSource = Pick<Item, "title" | "metadata">;

export function rawFileNameForItem(
  item: ItemTitleSource,
  driveFileName?: string,
): string {
  const meta = parseItemMetadata(item.metadata);
  if (meta.file_name?.trim()) {
    return meta.file_name.trim();
  }
  if (driveFileName?.trim()) {
    return driveFileName.trim();
  }
  return item.title.trim();
}

export function titleStillEqualsRawFileName(
  item: ItemTitleSource,
  driveFileName?: string,
): boolean {
  const raw = rawFileNameForItem(item, driveFileName);
  const titleNorm = item.title.trim().toLowerCase();
  const rawNorm = raw.toLowerCase();
  if (titleNorm === rawNorm) {
    return true;
  }
  const rawStem = raw.replace(/\.[^/.]+$/, "").trim().toLowerCase();
  return titleNorm === rawStem;
}

export function computeCleanedItemFields(
  item: Item,
  context: CleanItemTitleContext,
  driveFileName?: string,
): { title: string; metadata: Record<string, string>; changed: boolean } {
  const raw = rawFileNameForItem(item, driveFileName);
  const { title: cleanedTitle, file_name } = guessItemTitleFromFileName(
    raw,
    context.collectionName,
    { company: context.company },
  );

  const meta = parseItemMetadata(item.metadata);
  const preservedFileName = meta.file_name?.trim() || file_name;
  const nextMeta: ItemMetadata = {
    ...meta,
    file_name: preservedFileName,
  };

  const metadata = serializeItemMetadata(nextMeta);
  const changed =
    item.title.trim() !== cleanedTitle ||
    (meta.file_name ?? "") !== preservedFileName;

  return { title: cleanedTitle, metadata, changed };
}