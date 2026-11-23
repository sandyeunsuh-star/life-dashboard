export const KNITTING_STATUSES = [
  "In Queue",
  "Cast On / WIP",
  "Finished",
  "Frogged",
] as const;

export type KnittingStatus = (typeof KNITTING_STATUSES)[number];

export const KNITTING_CATEGORIES = [
  "Sweater",
  "Cardigan",
  "Dress",
  "Top / Tee",
  "Shawl / Wrap",
  "Socks",
  "Hat / Beanie",
  "Mittens / Gloves",
  "Bag / Accessory",
  "Home",
] as const;

export type KnittingCategory = (typeof KNITTING_CATEGORIES)[number];

export const YARN_WEIGHTS = [
  "Lace",
  "Fingering",
  "Sport",
  "DK",
  "Worsted",
  "Aran",
  "Bulky",
  "Super Bulky",
] as const;

export type YarnWeight = (typeof YARN_WEIGHTS)[number];

export const STATUS_PILL_STYLES: Record<KnittingStatus, string> = {
  "In Queue": "bg-zinc-100 text-zinc-700 border-zinc-200",
  "Cast On / WIP": "bg-blue-50 text-blue-800 border-blue-200",
  Finished: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Frogged: "bg-amber-50 text-amber-900 border-amber-200",
};