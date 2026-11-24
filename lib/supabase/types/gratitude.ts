export type GratitudeEntryRow = {
  id: string;
  user_id: string;
  entry_date: string;
  favorite_thing: string | null;
  favorite_why: string | null;
  favorite_photo_url: string | null;
  glimmer_1: string | null;
  glimmer_2: string | null;
  glimmer_3: string | null;
  points_awarded: boolean;
  created_at: string;
  updated_at: string;
};

export type UpsertGratitudeEntryInput = {
  id?: string;
  entry_date: string;
  favorite_thing?: string | null;
  favorite_why?: string | null;
  favorite_photo_url?: string | null;
  glimmer_1?: string | null;
  glimmer_2?: string | null;
  glimmer_3?: string | null;
};

export type GratitudeMemoryPick = {
  entryId: string;
  entryDate: string;
  label: string;
  photoUrl: string | null;
  source: "favorite" | "glimmer";
};

export type GratitudeSnapshot = {
  entries: GratitudeEntryRow[];
  todayEntry: GratitudeEntryRow | null;
  todayDate: string;
  randomMemory: GratitudeMemoryPick | null;
};