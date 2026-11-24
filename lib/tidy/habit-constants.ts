export type HabitTier = "simple" | "steady" | "complex";

export type HabitStatus = "incubating" | "established";

export const HABIT_INCUBATOR_MAX = 3;

export const HABIT_DAILY_POINTS = 5;

export const HABIT_TIER_OPTIONS = [
  {
    tier: "simple" as const,
    title: "Simple Habit",
    subtitle: "21 Days",
    targetDays: 21,
    graduationPoints: 250,
    blurb: "Quick anchor — three weeks to stick.",
  },
  {
    tier: "steady" as const,
    title: "Steady Routine",
    subtitle: "30 Days",
    targetDays: 30,
    graduationPoints: 450,
    blurb: "A month of reps builds rhythm.",
  },
  {
    tier: "complex" as const,
    title: "Complex Automaticity",
    subtitle: "66 Days",
    targetDays: 66,
    graduationPoints: 1000,
    blurb: "Science benchmark for automaticity.",
  },
] as const;

export function habitTierMeta(tier: HabitTier) {
  const found = HABIT_TIER_OPTIONS.find((t) => t.tier === tier);
  return found ?? HABIT_TIER_OPTIONS[0];
}

export function habitTargetLabel(targetDays: number): string {
  if (targetDays === 66) return `${targetDays} Days · Automatic`;
  if (targetDays === 30) return `${targetDays} Days · Routine`;
  return `${targetDays} Days · Simple`;
}