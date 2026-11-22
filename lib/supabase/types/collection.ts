import type { CollectionMetadataRecord } from "./collection-metadata";

export type Collection = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  slug: string;
  metadata: CollectionMetadataRecord;
  cover_image_url: string | null;
  created_at: string;
};

export type CollectionSummary = Collection & {
  item_count: number;
  preview_thumbnails: string[];
};

export type CreateCollectionInput = {
  name: string;
  description?: string | null;
  metadata?: CollectionMetadataRecord;
};

export type UpdateCollectionInput = {
  collectionId: string;
  name: string;
  description?: string | null;
  cover_image_url?: string | null;
  metadata?: CollectionMetadataRecord;
};

export type UpdateCollectionMetadataInput = {
  collectionId: string;
  metadata: CollectionMetadataRecord;
};