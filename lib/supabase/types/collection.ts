export type Collection = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  slug: string;
  created_at: string;
};

export type CreateCollectionInput = {
  name: string;
  description?: string | null;
};

export type UpdateCollectionInput = {
  collectionId: string;
  name: string;
  description?: string | null;
};