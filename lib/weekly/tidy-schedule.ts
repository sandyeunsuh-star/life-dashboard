import { DAY_KEYS, DAY_LABELS, type DayKey, type WeeklyDays } from "./constants";
import { todayDayKey } from "./dates";

export function buildTidyWeeklyScheduleMap(
  days: WeeklyDays,
  weekStart: string,
): Record<string, DayKey> {
  const map: Record<string, DayKey> = {};
  for (const day of DAY_KEYS) {
    for (const task of days[day] ?? []) {
      if (task.tidy_task_id) {
        map[task.tidy_task_id] = day;
      }
    }
  }
  return map;
}

export function tidyWeeklyScheduleLabel(
  day: DayKey,
  weekStart: string,
): string {
  const today = todayDayKey(weekStart);
  if (today === day) return "Today";
  const short = DAY_LABELS[day].slice(0, 3);
  return short.charAt(0) + short.slice(1, 3).toLowerCase();
}