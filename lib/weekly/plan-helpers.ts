import {
  DAY_KEYS,
  DEFAULT_RECURRING_TEMPLATE,
  EMPTY_WEEKLY_DAYS,
  type DayKey,
  type RecurringTemplate,
  type WeeklyDays,
  type WeeklyTask,
} from "./constants";

export function normalizeWeeklyDays(raw: unknown): WeeklyDays {
  const base = { ...EMPTY_WEEKLY_DAYS };
  if (!raw || typeof raw !== "object") return base;
  const record = raw as Record<string, unknown>;
  for (const day of DAY_KEYS) {
    const items = record[day];
    if (!Array.isArray(items)) continue;
    base[day] = items
      .filter((t) => t && typeof t === "object")
      .map((t) => {
        const row = t as Record<string, unknown>;
        const pointsRaw = row.points;
        const points =
          typeof pointsRaw === "number" && pointsRaw > 0
            ? Math.floor(pointsRaw)
            : 0;
        const tidyId =
          typeof row.tidy_task_id === "string" && row.tidy_task_id
            ? row.tidy_task_id
            : null;
        const claimRaw = row.anytime_claim_count;
        const anytime_claim_count =
          typeof claimRaw === "number" && claimRaw > 0
            ? Math.floor(claimRaw)
            : 0;
        return {
          id:
            typeof row.id === "string" && row.id
              ? row.id
              : crypto.randomUUID(),
          text: typeof row.text === "string" ? row.text : "",
          checked: Boolean(row.checked),
          ...(points > 0 ? { points } : {}),
          ...(tidyId ? { tidy_task_id: tidyId } : {}),
          ...(anytime_claim_count > 0 ? { anytime_claim_count } : {}),
        } satisfies WeeklyTask;
      });
  }
  return base;
}

export function normalizeRecurringTemplate(raw: unknown): RecurringTemplate {
  const base = { ...DEFAULT_RECURRING_TEMPLATE };
  if (!raw || typeof raw !== "object") return base;
  const record = raw as Record<string, unknown>;
  for (const day of DAY_KEYS) {
    const items = record[day];
    if (Array.isArray(items)) {
      base[day] = items
        .filter((s): s is string => typeof s === "string")
        .map((s) => s);
    }
  }
  return base;
}

function templateTasksForDay(
  template: RecurringTemplate,
  day: DayKey,
): WeeklyTask[] {
  return (template[day] ?? []).map((text) => ({
    id: crypto.randomUUID(),
    text,
    checked: false,
  }));
}

export function buildDaysFromTemplate(template: RecurringTemplate): WeeklyDays {
  const days = { ...EMPTY_WEEKLY_DAYS };
  for (const day of DAY_KEYS) {
    days[day] = templateTasksForDay(template, day);
  }
  return days;
}

export function collectUncheckedTasks(days: WeeklyDays): WeeklyTask[] {
  const out: WeeklyTask[] = [];
  for (const day of DAY_KEYS) {
    for (const task of days[day] ?? []) {
      if (!task.checked && task.text.trim()) {
        out.push({
          ...task,
          id: crypto.randomUUID(),
          checked: false,
        });
      }
    }
  }
  return out;
}

export function applyRolloverToMonday(
  days: WeeklyDays,
  rolled: WeeklyTask[],
): WeeklyDays {
  if (rolled.length === 0) return days;
  return {
    ...days,
    monday: [...rolled, ...days.monday],
  };
}

export function moveTaskToNextDay(
  days: WeeklyDays,
  fromDay: DayKey,
  taskId: string,
): WeeklyDays {
  const next = nextDayKey(fromDay);
  if (!next) return days;
  const fromTasks = days[fromDay];
  const task = fromTasks.find((t) => t.id === taskId);
  if (!task || task.checked) return days;
  return {
    ...days,
    [fromDay]: fromTasks.filter((t) => t.id !== taskId),
    [next]: [...days[next], { ...task, id: crypto.randomUUID(), checked: false }],
  };
}

function nextDayKey(day: DayKey): DayKey | null {
  const i = DAY_KEYS.indexOf(day);
  if (i < 0 || i >= DAY_KEYS.length - 1) return null;
  return DAY_KEYS[i + 1];
}