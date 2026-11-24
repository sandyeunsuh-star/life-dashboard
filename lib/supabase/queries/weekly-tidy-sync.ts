import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { DayKey, WeeklyDays, WeeklyTask } from "@/lib/weekly/constants";
import { DAY_KEYS } from "@/lib/weekly/constants";
import { getMondayOfWeek, toDateString, todayDayKey } from "@/lib/weekly/dates";
import { normalizeWeeklyDays } from "@/lib/weekly/plan-helpers";
import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import type { WeeklyPlanRow } from "../types/weekly-plan";
import type { TidyTask } from "../types/tidy";
import {
  claimTidyAnytimeTask,
  toggleTidyTaskComplete,
} from "./tidy";
import { sumTidyPointBalance } from "./tidy";
import { weeklyTaskPoints } from "@/lib/weekly/task-points";
import { serializeWeeklyTaskForStorage } from "@/lib/weekly/serialize-days";
import {
  ensureCurrentWeekPlan,
  ensureWeekPlanForWeekStart,
  getWeeklyPlanByWeekStart,
  upsertWeeklyPlanDays,
} from "./weekly-plans";
import {
  insertTidyPointLog,
  tidyPointLogPayload,
} from "../tidy-point-log";
import { fetchTidyTaskById } from "./tidy";

async function logWeeklyTaskPoints(
  supabase: SupabaseClient,
  userId: string,
  task: WeeklyTask,
  complete: boolean,
) {
  const pts = Math.max(0, Math.floor(task.points ?? 0));
  if (pts <= 0) return { error: null as PostgrestError | null };

  const reason = `Weekly: ${task.text.trim() || "Task"}`;
  const logRes = await insertTidyPointLog(supabase, {
    user_id: userId,
    points: complete ? pts : -pts,
    kind: complete ? "weekly_task" : "weekly_task_undo",
    weekly_task_id: task.id,
    task_id: task.tidy_task_id ?? null,
    reason,
  });

  if (logRes.error) {
    logSupabaseError("logWeeklyTaskPoints", logRes.error);
    console.error(
      "[tidy_point_logs] weekly task insert failed:",
      logRes.error.message,
      tidyPointLogPayload({
        user_id: userId,
        points: complete ? pts : -pts,
        kind: complete ? "weekly_task" : "weekly_task_undo",
        weekly_task_id: task.id,
        task_id: task.tidy_task_id ?? null,
        reason,
      }),
    );
    return { error: logRes.error };
  }
  return { error: null };
}

/** Net points logged for a weekly row (credits minus undos). */
export async function weeklyTaskPointsNetLogged(
  supabase: SupabaseClient,
  userId: string,
  weeklyTaskId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("tidy_point_logs")
    .select("points")
    .eq("user_id", userId)
    .eq("weekly_task_id", weeklyTaskId)
    .in("kind", ["weekly_task", "weekly_task_undo"]);

  if (error) {
    logSupabaseError("weeklyTaskPointsNetLogged", error);
    return 0;
  }
  return (data ?? []).reduce((sum, row) => sum + (row.points as number), 0);
}

function findWeeklyTasksByTidyId(
  days: WeeklyDays,
  tidyTaskId: string,
): { day: DayKey; task: WeeklyTask; index: number }[] {
  const hits: { day: DayKey; task: WeeklyTask; index: number }[] = [];
  for (const day of DAY_KEYS) {
    const list = days[day] ?? [];
    list.forEach((task, index) => {
      if (task.tidy_task_id === tidyTaskId) {
        hits.push({ day, task, index });
      }
    });
  }
  return hits;
}

function cloneDays(days: WeeklyDays): WeeklyDays {
  const next = { ...days };
  for (const day of DAY_KEYS) {
    next[day] = [...(days[day] ?? [])];
  }
  return next;
}

export async function syncWeeklyTaskChecked(
  supabase: SupabaseClient,
  planId: string,
  days: WeeklyDays,
  day: DayKey,
  task: WeeklyTask,
  checked: boolean,
  tidyTask?: TidyTask | null,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      days,
      balance: 0,
      pointsDelta: 0,
      error: authError,
    };
  }

  let nextDays = cloneDays(days);
  const list = nextDays[day] ?? [];
  const idx = list.findIndex((t) => t.id === task.id);
  if (idx < 0) {
    return {
      days,
      balance: await sumTidyPointBalance(supabase, user.id),
      pointsDelta: 0,
      error: {
        message: "Task not found",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const row = list[idx]!;
  const merged: WeeklyTask = { ...row, ...task, checked };
  const pts = weeklyTaskPoints(merged);

  let pointsDelta = 0;
  let linkedTidy = tidyTask ?? null;

  if (merged.tidy_task_id && !linkedTidy) {
    const fetched = await fetchTidyTaskById(supabase, merged.tidy_task_id);
    linkedTidy = fetched.data;
  }

  if (merged.tidy_task_id && linkedTidy) {
    if (linkedTidy.recurrence === "anytime") {
      /* Anytime uses +1 claim, not checkbox completion. */
    } else {
      const toggleRes = await toggleTidyTaskComplete(
        supabase,
        linkedTidy,
        checked,
      );
      if (toggleRes.error) {
        console.error(
          "[weekly-tidy-sync] linked tidy toggle failed:",
          toggleRes.error,
        );
        return {
          days,
          balance: toggleRes.balance,
          pointsDelta: 0,
          error: toggleRes.error,
        };
      }
      if (checked) pointsDelta = linkedTidy.points;
      else pointsDelta = -linkedTidy.points;
    }
  } else if (!merged.tidy_task_id && pts > 0) {
    const net = await weeklyTaskPointsNetLogged(supabase, user.id, merged.id);
    if (checked) {
      if (net <= 0) {
        const logRes = await logWeeklyTaskPoints(
          supabase,
          user.id,
          merged,
          true,
        );
        if (logRes.error) {
          return {
            days,
            balance: await sumTidyPointBalance(supabase, user.id),
            pointsDelta: 0,
            error: logRes.error,
          };
        }
        pointsDelta = pts;
      }
    } else if (net > 0) {
      const logRes = await logWeeklyTaskPoints(
        supabase,
        user.id,
        merged,
        false,
      );
      if (logRes.error) {
        return {
          days,
          balance: await sumTidyPointBalance(supabase, user.id),
          pointsDelta: 0,
          error: logRes.error,
        };
      }
      pointsDelta = -pts;
    }
  }

  const updated: WeeklyTask = {
    ...merged,
    checked,
  };
  list[idx] = updated;
  nextDays[day] = list;

  const persist = await upsertWeeklyPlanDays(supabase, planId, nextDays);
  if (persist.error || !persist.data) {
    return {
      days,
      balance: await sumTidyPointBalance(supabase, user.id),
      pointsDelta: 0,
      error: persist.error,
    };
  }

  const balance = await sumTidyPointBalance(supabase, user.id);
  return {
    days: persist.data.days,
    balance,
    pointsDelta,
    error: null,
  };
}

export async function claimAnytimeFromWeekly(
  supabase: SupabaseClient,
  planId: string,
  days: WeeklyDays,
  day: DayKey,
  task: WeeklyTask,
  tidyTask: TidyTask,
) {
  const claimRes = await claimTidyAnytimeTask(supabase, tidyTask);
  if (claimRes.error || !claimRes.data) {
    return {
      days,
      balance: claimRes.balance,
      pointsDelta: 0,
      error: claimRes.error,
    };
  }

  const stamped = await stampAnytimeOnWeeklyDays(
    supabase,
    planId,
    days,
    day,
    task,
    tidyTask,
    true,
  );

  return {
    ...stamped,
    pointsDelta: tidyTask.points,
    tidyTask: claimRes.data,
  };
}

async function stampAnytimeOnWeeklyDays(
  supabase: SupabaseClient,
  planId: string,
  days: WeeklyDays,
  day: DayKey,
  existingTask: WeeklyTask | null,
  tidyTask: TidyTask,
  increment: boolean,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      days,
      balance: 0,
      error: authError
        ? ({ message: authError.message, code: authError.name } as PostgrestError)
        : null,
    };
  }

  let nextDays = cloneDays(days);
  const list = [...(nextDays[day] ?? [])];
  let taskId = existingTask?.id;

  if (existingTask) {
    const idx = list.findIndex((t) => t.id === existingTask.id);
    if (idx >= 0) {
      if (increment) {
        const count = (existingTask.anytime_claim_count ?? 0) + 1;
        list[idx] = {
          ...existingTask,
          text: tidyTask.title,
          points: tidyTask.points,
          tidy_task_id: tidyTask.id,
          checked: true,
          anytime_claim_count: Math.max(1, count),
        };
      } else {
        const prev = existingTask.anytime_claim_count ?? 1;
        const nextCount = Math.max(0, prev - 1);
        const row: WeeklyTask = {
          ...existingTask,
          text: tidyTask.title,
          points: tidyTask.points,
          tidy_task_id: tidyTask.id,
          checked: nextCount > 0,
        };
        if (nextCount > 0) {
          row.anytime_claim_count = nextCount;
        } else {
          delete row.anytime_claim_count;
        }
        list[idx] = row;
      }
    }
  } else if (increment) {
    taskId = crypto.randomUUID();
    list.push({
      id: taskId,
      text: tidyTask.title,
      checked: true,
      points: tidyTask.points,
      tidy_task_id: tidyTask.id,
      anytime_claim_count: 1,
    });
  }

  nextDays[day] = list;
  const persist = await upsertWeeklyPlanDays(supabase, planId, nextDays);
  if (persist.error || !persist.data) {
    return {
      days,
      balance: await sumTidyPointBalance(supabase, user.id),
      error: persist.error,
    };
  }

  return {
    days: persist.data.days,
    balance: await sumTidyPointBalance(supabase, user.id),
    error: null,
  };
}

export async function stampAnytimeClaimOnWeekly(
  supabase: SupabaseClient,
  tidyTask: TidyTask,
) {
  if (tidyTask.recurrence !== "anytime") {
    return { error: null as PostgrestError | null };
  }

  const weekStart = toDateString(getMondayOfWeek(new Date()));
  const planRes = await ensureCurrentWeekPlan(supabase);
  if (planRes.error || !planRes.data) {
    return { error: planRes.error };
  }

  const plan = planRes.data;
  const today = todayDayKey(plan.week_start);
  if (!today) {
    return { error: null };
  }

  const days = plan.days;
  const hits = findWeeklyTasksByTidyId(days, tidyTask.id).filter(
    (h) => h.day === today,
  );
  const existing = hits[0]?.task ?? null;

  await stampAnytimeOnWeeklyDays(
    supabase,
    plan.id,
    days,
    today,
    existing,
    tidyTask,
    true,
  );

  return { error: null };
}

/** Decrement today's Weekly stamp when reversing an accidental Anytime claim. */
export async function unstampAnytimeClaimOnWeekly(
  supabase: SupabaseClient,
  tidyTask: TidyTask,
) {
  if (tidyTask.recurrence !== "anytime") {
    return { error: null as PostgrestError | null };
  }

  const planRes = await ensureCurrentWeekPlan(supabase);
  if (planRes.error || !planRes.data) {
    return {
      error: planRes.error
        ? (planRes.error as PostgrestError)
        : ({
            message: "No weekly plan",
            code: "not_found",
          } as PostgrestError),
    };
  }

  const plan = planRes.data;
  const today = todayDayKey(plan.week_start);
  if (!today) {
    return { error: null };
  }

  const days = plan.days;
  const hits = findWeeklyTasksByTidyId(days, tidyTask.id).filter(
    (h) => h.day === today,
  );
  const existing = hits[0]?.task ?? null;

  const stamped = await stampAnytimeOnWeeklyDays(
    supabase,
    plan.id,
    days,
    today,
    existing,
    tidyTask,
    false,
  );

  return { error: stamped.error };
}

export async function syncTidyCompletionToWeekly(
  supabase: SupabaseClient,
  tidyTask: TidyTask,
  complete: boolean,
) {
  if (tidyTask.recurrence === "anytime") {
    return { error: null as PostgrestError | null };
  }

  const weekStart = toDateString(getMondayOfWeek(new Date()));
  const planRes = await getWeeklyPlanByWeekStart(supabase, weekStart);
  if (planRes.error || !planRes.data) {
    return { error: planRes.error };
  }

  const plan = planRes.data;
  const hits = findWeeklyTasksByTidyId(plan.days, tidyTask.id);
  if (hits.length === 0) {
    return { error: null };
  }

  let nextDays = cloneDays(plan.days);
  for (const hit of hits) {
    const list = [...(nextDays[hit.day] ?? [])];
    list[hit.index] = { ...hit.task, checked: complete };
    nextDays[hit.day] = list;
  }

  const persist = await upsertWeeklyPlanDays(supabase, plan.id, nextDays);
  if (persist.error) {
    logSupabaseError("syncTidyCompletionToWeekly", persist.error);
    return { error: persist.error };
  }

  return { error: null };
}

export type SendTidyToWeeklyInput = {
  tidyTask: TidyTask;
  day: DayKey;
  weekStart?: string;
};

export async function sendTidyTaskToWeekly(
  supabase: SupabaseClient,
  input: SendTidyToWeeklyInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      data: null,
      error: authError
        ? ({ message: authError.message, code: authError.name } as PostgrestError)
        : null,
    };
  }

  const weekStart =
    input.weekStart ?? toDateString(getMondayOfWeek(new Date()));

  let planRes = await getWeeklyPlanByWeekStart(supabase, weekStart);
  if (planRes.error) {
    logSupabaseError("sendTidyTaskToWeekly getWeeklyPlan", planRes.error);
    return { data: null, error: planRes.error };
  }
  if (!planRes.data) {
    planRes = await ensureWeekPlanForWeekStart(supabase, weekStart);
  }
  if (planRes.error) {
    logSupabaseError("sendTidyTaskToWeekly ensureWeekPlan", planRes.error);
    return { data: null, error: planRes.error };
  }
  if (!planRes.data) {
    return {
      data: null,
      error: {
        message: "Could not load or create a Weekly plan for this week.",
        code: "weekly_plan_missing",
      } as PostgrestError,
    };
  }

  const plan = planRes.data;
  if (plan.week_start !== weekStart) {
    return {
      data: null,
      error: {
        message: `Weekly plan week mismatch (expected ${weekStart}, got ${plan.week_start}).`,
        code: "week_mismatch",
      } as PostgrestError,
    };
  }
  const existing = findWeeklyTasksByTidyId(plan.days, input.tidyTask.id);
  if (existing.length > 0) {
    const hit = existing[0]!;
    return {
      data: {
        plan,
        day: hit.day,
        task: hit.task,
        alreadyScheduled: true as const,
      },
      error: null,
    };
  }

  const task: WeeklyTask = serializeWeeklyTaskForStorage({
    id: crypto.randomUUID(),
    text: input.tidyTask.title.trim() || input.tidyTask.title,
    checked: false,
    points: input.tidyTask.points,
    tidy_task_id: input.tidyTask.id,
  });

  const nextDays = cloneDays(plan.days);
  nextDays[input.day] = [...(nextDays[input.day] ?? []), task];

  const persist = await upsertWeeklyPlanDays(supabase, plan.id, nextDays);
  if (persist.error) {
    logSupabaseError("sendTidyTaskToWeekly persist", persist.error);
    return { data: null, error: persist.error };
  }
  if (!persist.data) {
    return {
      data: null,
      error: {
        message: "Weekly plan did not save — try again.",
        code: "weekly_plan_persist",
      } as PostgrestError,
    };
  }

  return {
    data: {
      plan: persist.data,
      day: input.day,
      task,
      alreadyScheduled: false as const,
    },
    error: null,
  };
}

export async function fetchCurrentWeekPlanForTidy(
  supabase: SupabaseClient,
): Promise<{ plan: WeeklyPlanRow | null; error: PostgrestError | null }> {
  const weekStart = toDateString(getMondayOfWeek(new Date()));
  const res = await getWeeklyPlanByWeekStart(supabase, weekStart);
  if (res.error) {
    return {
      plan: null,
      error:
        res.error && "code" in res.error
          ? (res.error as PostgrestError)
          : ({
              message: String(res.error),
              code: "auth_error",
            } as PostgrestError),
    };
  }
  if (res.data) return { plan: res.data, error: null };
  const ensured = await ensureCurrentWeekPlan(supabase);
  if (ensured.error) {
    return {
      plan: ensured.data,
      error:
        ensured.error && "code" in ensured.error
          ? (ensured.error as PostgrestError)
          : ({
              message: String(ensured.error),
              code: "auth_error",
            } as PostgrestError),
    };
  }
  return { plan: ensured.data, error: null };
}

export function mergeNormalizedDays(plan: WeeklyPlanRow | null): WeeklyDays | null {
  if (!plan) return null;
  return normalizeWeeklyDays(plan.days);
}

/** Credit `weekly_task` logs for checked weekly-only rows that never logged (e.g. pre-sync). */
export async function backfillWeeklyCheckedPointTasks(
  supabase: SupabaseClient,
  planId: string,
  days: WeeklyDays,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      days,
      balance: 0,
      credited: 0,
      error: authError,
    };
  }

  let credited = 0;

  for (const day of DAY_KEYS) {
    for (const task of days[day] ?? []) {
      const pts = weeklyTaskPoints(task);
      if (!task.checked || pts <= 0 || task.tidy_task_id) {
        continue;
      }
      const net = await weeklyTaskPointsNetLogged(supabase, user.id, task.id);
      if (net > 0) {
        continue;
      }
      const logRes = await logWeeklyTaskPoints(supabase, user.id, task, true);
      if (!logRes.error) {
        credited += pts;
      }
    }
  }

  const balance = await sumTidyPointBalance(supabase, user.id);
  return { days, balance, credited, error: null };
}