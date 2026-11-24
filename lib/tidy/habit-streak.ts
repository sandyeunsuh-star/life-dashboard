import {
  addDays,
  getMondayOfWeek,
  parseDateString,
  toDateString,
} from "@/lib/weekly/dates";

export type HabitStreakMeta = {
  streak: number;
  graceUsed: boolean;
};

function uniqueSortedDates(dates: string[]): string[] {
  return [...new Set(dates)].filter(Boolean).sort();
}

/** Calendar day difference: later − earlier (in whole days). */
export function calendarDayDiff(earlierYmd: string, laterYmd: string): number {
  const a = parseDateString(earlierYmd);
  const b = parseDateString(laterYmd);
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Active streak from unique local `YYYY-MM-DD` check-ins (newest segment).
 * · Consecutive calendar days → streak grows.
 * · Exactly one missed day between check-ins (diff 2) → grace once per chain.
 * · Two or more missed days (diff ≥ 3) → chain breaks.
 */
export function computeHabitStreakMeta(
  checkInDates: string[],
): HabitStreakMeta {
  const unique = uniqueSortedDates(checkInDates);
  if (unique.length === 0) {
    return { streak: 0, graceUsed: false };
  }

  let streak = 1;
  let graceUsed = false;

  for (let i = unique.length - 2; i >= 0; i--) {
    const diff = calendarDayDiff(unique[i]!, unique[i + 1]!);
    if (diff === 1) {
      streak += 1;
    } else if (diff === 2) {
      if (graceUsed) break;
      graceUsed = true;
      streak += 1;
    } else {
      break;
    }
  }

  return { streak, graceUsed };
}

/** Skipped calendar day protected by grace in the active chain (if any). */
export function findGraceGapInActiveChain(
  checkInDates: string[],
): string | null {
  const unique = uniqueSortedDates(checkInDates);
  if (unique.length < 2) return null;

  let graceUsed = false;
  for (let i = unique.length - 2; i >= 0; i--) {
    const diff = calendarDayDiff(unique[i]!, unique[i + 1]!);
    if (diff === 1) continue;
    if (diff === 2) {
      if (graceUsed) break;
      return toDateString(addDays(parseDateString(unique[i]!), 1));
    }
    break;
  }
  return null;
}

export function currentCalendarWeekDates(anchorTodayYmd: string) {
  const today = parseDateString(anchorTodayYmd);
  const monday = getMondayOfWeek(today);
  const labels = ["M", "T", "W", "T", "F", "S", "S"] as const;
  return labels.map((label, i) => ({
    label,
    ymd: toDateString(addDays(monday, i)),
  }));
}

export function normalizeCheckInDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item)) {
      out.push(item);
    }
  }
  return uniqueSortedDates(out);
}