import { DAY_KEYS, type WeeklyDays, type WeeklyTask } from "./constants";

/** Ensure points / links survive JSONB round-trips in `weekly_plans.days`. */
export function serializeWeeklyTaskForStorage(task: WeeklyTask): WeeklyTask {
  const points = Math.max(0, Math.floor(task.points ?? 0));
  const anytime_claim_count = Math.max(
    0,
    Math.floor(task.anytime_claim_count ?? 0),
  );
  return {
    id: task.id,
    text: task.text,
    checked: Boolean(task.checked),
    ...(points > 0 ? { points } : {}),
    ...(task.tidy_task_id ? { tidy_task_id: task.tidy_task_id } : {}),
    ...(anytime_claim_count > 0 ? { anytime_claim_count } : {}),
  };
}

export function prepareWeeklyDaysForStorage(days: WeeklyDays): WeeklyDays {
  const next = { ...days };
  for (const day of DAY_KEYS) {
    next[day] = (days[day] ?? []).map(serializeWeeklyTaskForStorage);
  }
  return next;
}