export const METADATA_SEASONS = [
  "Spring",
  "Summer",
  "Fall",
  "Winter",
] as const;

export const METADATA_YEARS = Array.from({ length: 27 }, (_, index) =>
  String(2000 + index),
);

export const DEFAULT_ITEM_TYPES = ["Paper", "Card", "Embellishment"] as const;

export const METADATA_KEYS = {
  company: "company",
  collection: "collection",
  published: "published",
  designer: "designer",
  type: "type",
  file_name: "file_name",
  palette: "palette",
  drive_folder_url: "drive_folder_url",
} as const;

export const ADD_NEW_OPTION = "__add_new__";