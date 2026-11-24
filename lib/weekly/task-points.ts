import type { WeeklyTask } from "@/lib/weekly/constants";

export function weeklyTaskPoints(task: WeeklyTask): number {
  return Math.max(0, Math.floor(task.points ?? 0));
}