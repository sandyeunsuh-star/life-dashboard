import type { TidyRecurrence } from "@/lib/tidy/constants";

/** Start of local calendar day. */
export function startOfLocalDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const BIWEEK_ANCHOR = new Date(2020, 0, 6);

/** Monday 00:00 local (week starts Monday). */
export function startOfLocalWeek(d: Date = new Date()): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function startOfLocalMonth(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Start of the current 14-day block (Monday-aligned). */
export function startOfLocalBiweek(d: Date = new Date()): Date {
  const weekStart = startOfLocalWeek(d);
  const biweekMs = 14 * 24 * 60 * 60 * 1000;
  const anchor = startOfLocalWeek(BIWEEK_ANCHOR);
  const elapsed = weekStart.getTime() - anchor.getTime();
  const index = Math.floor(elapsed / biweekMs);
  return new Date(anchor.getTime() + index * biweekMs);
}

export function isTaskEffectivelyComplete(
  recurrence: TidyRecurrence,
  completedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!completedAt) {
    return false;
  }
  const completed = new Date(completedAt);
  if (Number.isNaN(completed.getTime())) {
    return false;
  }

  switch (recurrence) {
    case "anytime":
      return false;
    case "side_quests":
      return Boolean(completedAt);
    case "one_off":
      return true;
    case "daily":
      return completed >= startOfLocalDay(now);
    case "weekly":
      return completed >= startOfLocalWeek(now);
    case "biweekly":
      return completed >= startOfLocalBiweek(now);
    case "monthly":
      return completed >= startOfLocalMonth(now);
    default:
      return false;
  }
}