import type { LucideIcon } from "lucide-react";
import {
  Bed,
  BookOpen,
  CheckCircle2,
  Droplets,
  Heart,
  Home,
  Leaf,
  Mail,
  PawPrint,
  Scissors,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Utensils,
  Shirt,
  Wand2,
} from "lucide-react";

export const TIDY_RECURRENCES = [
  { value: "anytime", label: "Anytime" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "side_quests", label: "Side Quests" },
] as const;

/** Legacy DB value — still readable in task lists. */
export const TIDY_RECURRENCE_LEGACY_ONE_OFF = "one_off" as const;

export const TIDY_QUEST_SECTIONS = [
  {
    id: "anytime" as const,
    title: "Anytime",
    subtitle: null as string | null,
  },
  { id: "daily" as const, title: "Daily", subtitle: null },
  { id: "weekly" as const, title: "Weekly", subtitle: null },
  { id: "biweekly" as const, title: "Biweekly", subtitle: null },
  { id: "monthly" as const, title: "Monthly", subtitle: null },
  {
    id: "side_quests" as const,
    title: "Side Quests",
    subtitle: "Small household projects for whenever you have time",
  },
] as const;

export type TidyQuestSectionId =
  (typeof TIDY_QUEST_SECTIONS)[number]["id"];

export const TIDY_WIN_LOG_PRESETS = [5, 15, 30] as const;

export type TidyRecurrence =
  | (typeof TIDY_RECURRENCES)[number]["value"]
  | typeof TIDY_RECURRENCE_LEGACY_ONE_OFF;

export function tidyRecurrenceLabel(recurrence: TidyRecurrence): string {
  return (
    TIDY_RECURRENCES.find((r) => r.value === recurrence)?.label ??
    recurrence.replaceAll("_", " ")
  );
}

export const TIDY_POINT_PRESETS = [5, 15, 30, 50] as const;

export const TIDY_MICRO_STEP_DEFAULT_POINTS = 2;

export const TIDY_BUNDLE_PRESETS = [
  "🎧 Audiobook / Podcast",
  "📺 Show / K-Drama",
  "🎵 Playlist",
  "☕ Iced Coffee",
] as const;

export const TIDY_REWARD_TIERS = [
  { value: "micro", label: "Micro-Treat" },
  { value: "medium", label: "Medium Reward" },
  { value: "grail", label: "Grail Reward" },
] as const;

export type TidyRewardTier = (typeof TIDY_REWARD_TIERS)[number]["value"];

export const TIDY_REWARD_TIER_FILTERS = [
  { id: "all", label: "All" },
  { id: "micro", label: "Micro-Treats" },
  { id: "medium", label: "Medium" },
  { id: "grail", label: "Grail" },
] as const;

export type TidyRewardTierFilter =
  (typeof TIDY_REWARD_TIER_FILTERS)[number]["id"];

export const TIDY_MYSTERY_SPIN_STORAGE_KEY =
  "life-dashboard:tidy-mystery-spin-cost";

export const TIDY_MYSTERY_SPIN_DEFAULT = 30;

export type TidyIconKey =
  | "sparkles"
  | "wand-2"
  | "shirt"
  | "utensils"
  | "bed"
  | "trash-2"
  | "droplets"
  | "leaf"
  | "paw-print"
  | "heart"
  | "book-open"
  | "scissors"
  | "shopping-bag"
  | "mail"
  | "sun"
  | "home"
  | "check-circle-2"
  | "star";

export const TIDY_ICON_OPTIONS: {
  key: TidyIconKey;
  label: string;
  icon: LucideIcon;
  tint: string;
}[] = [
  { key: "sparkles", label: "Sparkles", icon: Sparkles, tint: "bg-violet-100 text-violet-700" },
  { key: "wand-2", label: "Clean", icon: Wand2, tint: "bg-sky-100 text-sky-700" },
  { key: "shirt", label: "Laundry", icon: Shirt, tint: "bg-indigo-100 text-indigo-700" },
  { key: "utensils", label: "Kitchen", icon: Utensils, tint: "bg-amber-100 text-amber-800" },
  { key: "bed", label: "Bedroom", icon: Bed, tint: "bg-rose-100 text-rose-700" },
  { key: "trash-2", label: "Trash", icon: Trash2, tint: "bg-zinc-200 text-zinc-700" },
  { key: "droplets", label: "Wet", icon: Droplets, tint: "bg-cyan-100 text-cyan-800" },
  { key: "leaf", label: "Plants", icon: Leaf, tint: "bg-emerald-100 text-emerald-800" },
  { key: "paw-print", label: "Pets", icon: PawPrint, tint: "bg-orange-100 text-orange-800" },
  { key: "heart", label: "Care", icon: Heart, tint: "bg-pink-100 text-pink-700" },
  { key: "book-open", label: "Read", icon: BookOpen, tint: "bg-teal-100 text-teal-800" },
  { key: "scissors", label: "Trim", icon: Scissors, tint: "bg-fuchsia-100 text-fuchsia-800" },
  { key: "shopping-bag", label: "Errands", icon: ShoppingBag, tint: "bg-lime-100 text-lime-800" },
  { key: "mail", label: "Mail", icon: Mail, tint: "bg-blue-100 text-blue-800" },
  { key: "sun", label: "Morning", icon: Sun, tint: "bg-yellow-100 text-yellow-800" },
  { key: "home", label: "Home", icon: Home, tint: "bg-stone-200 text-stone-800" },
  {
    key: "check-circle-2",
    label: "Done",
    icon: CheckCircle2,
    tint: "bg-green-100 text-green-800",
  },
  { key: "star", label: "Star", icon: Star, tint: "bg-amber-100 text-amber-900" },
];

const ICON_BY_KEY = new Map(TIDY_ICON_OPTIONS.map((o) => [o.key, o]));

export function tidyIconOption(key: string) {
  return ICON_BY_KEY.get(key as TidyIconKey) ?? TIDY_ICON_OPTIONS[0]!;
}