import type { CollectionMetadataRecord } from "../types/collection-metadata";
import { parseCollectionMetadata, type CollectionMetadata } from "./collection-schema";
import { parseItemMetadata, type ItemMetadata } from "./schema";

export type EffectiveItemMetadata = {
  company?: string;
  designer?: string;
  published?: string;
  type?: string;
  file_name?: string;
};

export function resolveEffectiveItemMetadata(
  itemMetadata: Record<string, string> | null | undefined,
  collectionMetadata: CollectionMetadataRecord | null | undefined,
): EffectiveItemMetadata {
  const item = parseItemMetadata(itemMetadata);
  const album = parseCollectionMetadata(collectionMetadata);

  return {
    company: item.company ?? album.company,
    designer: item.designer ?? album.designer,
    published: item.published ?? album.published,
    type: item.type,
    file_name: item.file_name,
  };
}