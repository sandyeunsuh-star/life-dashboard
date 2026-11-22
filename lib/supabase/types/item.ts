export type Item = {
  id: string;
  user_id: string;
  collection_id: string;
  title: string;
  thumbnail_url: string;
  drive_url: string | null;
  tags: string[];
  metadata: Record<string, string>;
  created_at: string;
};

export type CreateItemInput = {
  collectionId: string;
  imageFile: File;
  title: string;
  driveUrl?: string | null;
  tags: string[];
  metadata: Record<string, string>;
};

export type UpdateItemInput = {
  itemId: string;
  title: string;
  tags: string[];
  metadata: Record<string, string>;
};