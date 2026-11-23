export const SEWING_STATUSES = [
  "In Queue",
  "Cut Out / WIP",
  "Finished",
  "Muslin / Toile",
] as const;

export type SewingStatus = (typeof SEWING_STATUSES)[number];

export const SEWING_CATEGORIES = [
  "Dress",
  "Top / Blouse",
  "Pants / Trousers",
  "Skirt",
  "Jacket / Coat",
  "Jumpsuit / Romper",
  "Activewear / Loungewear",
  "Project Bag",
  "Tote",
  "Backpack",
  "Pouch / Zipper Bag",
  "Wallet / Crossbody",
  "Home / Decor",
] as const;

export type SewingCategory = (typeof SEWING_CATEGORIES)[number];

/** Categories kept for saved rows / filters; not offered for new picks. */
export const LEGACY_SEWING_CATEGORIES = ["Bag / Accessory", "Home"] as const;

/** Options for `<select>` — includes the current value when it is legacy. */
export function sewingCategorySelectOptions(
  current?: string | null,
): string[] {
  const options: string[] = [...SEWING_CATEGORIES];
  const value = current?.trim();
  if (
    value &&
    !(SEWING_CATEGORIES as readonly string[]).includes(value) &&
    !options.includes(value)
  ) {
    options.push(value);
  }
  return options;
}

export function formatSewingCategoryLabel(category: string | null): string {
  if (!category?.trim()) return "";
  return category;
}

export const FABRIC_TYPES = [
  "Woven",
  "Knit / Stretch",
  "Denim / Canvas",
  "Linen",
  "Silk / Satin",
  "Wool / Coating",
  "Lightweight / Sheer",
] as const;

export type FabricType = (typeof FABRIC_TYPES)[number];

export const STATUS_PILL_STYLES: Record<SewingStatus, string> = {
  "In Queue": "bg-zinc-100 text-zinc-700 border-zinc-200",
  "Cut Out / WIP": "bg-blue-50 text-blue-800 border-blue-200",
  Finished: "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Muslin / Toile": "bg-amber-50 text-amber-900 border-amber-200",
};