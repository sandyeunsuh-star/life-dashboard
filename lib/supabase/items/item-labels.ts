import { parseItemMetadata } from "../metadata/schema";
import type { Item } from "../types/item";

export function getItemFileName(item: Item): string | undefined {
  const meta = parseItemMetadata(item.metadata);
  return meta.file_name?.trim() || undefined;
}

export function itemFileNameDiffersFromTitle(item: Item): boolean {
  const fileName = getItemFileName(item);
  if (!fileName) return false;
  return fileName.toLowerCase() !== item.title.trim().toLowerCase();
}