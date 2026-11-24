import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { TidyRecurrence, TidyRewardTier } from "@/lib/tidy/constants";
import {
  allMicroStepsComplete,
  parseMicroSteps,
  resetMicroStepsForStorage,
  taskNeedsPeriodReset,
} from "@/lib/tidy/micro-steps";
import { isTaskEffectivelyComplete } from "@/lib/tidy/task-reset";
import { getMondayOfWeek, toDateString } from "@/lib/weekly/dates";
import { buildTidyWeeklyScheduleMap } from "@/lib/weekly/tidy-schedule";
import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import { fetchTidyHabitsForUser } from "./tidy-habits";
import { fetchCurrentWeekPlanForTidy } from "./weekly-tidy-sync";
import {
  insertTidyPointLog,
  pointLogRowAmount,
} from "../tidy-point-log";
import type {
  TidyGuildSnapshot,
  TidyMicroStep,
  TidyPointWin,
  TidyReward,
  TidyTask,
} from "../types/tidy";

const RECENT_POINT_WIN_KINDS = [
  "weekly_task",
  "vault_skip",
  "task_complete",
  "anytime_claim",
  "ad_hoc_win",
  "habit_checkin",
  "habit_graduation",
] as const;

const TASK_SELECT =
  "id, user_id, title, icon_key, points, recurrence, completed_at, micro_steps, bundle_tag, created_at, updated_at";
const REWARD_SELECT =
  "id, user_id, title, points_cost, image_path, image_url, link_url, source_url, vault_item_id, knitting_pattern_id, sewing_pattern_id, is_goal, is_repeatable, redeemed_count, tier, is_mystery, created_at, updated_at";

function normalizeTidyTask(row: TidyTask): TidyTask {
  return {
    ...row,
    micro_steps: parseMicroSteps(row.micro_steps),
    bundle_tag: row.bundle_tag?.trim() || null,
  };
}

function normalizeTidyReward(row: TidyReward): TidyReward {
  return {
    ...row,
    image_url: row.image_url?.trim() || null,
    source_url: row.source_url?.trim() || null,
    vault_item_id: row.vault_item_id ?? null,
    knitting_pattern_id: row.knitting_pattern_id ?? null,
    sewing_pattern_id: row.sewing_pattern_id ?? null,
    tier: row.tier ?? "medium",
    is_mystery: row.is_mystery ?? false,
  };
}

async function fetchRecentPointWinsForUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<TidyPointWin[]> {
  const { data, error } = await supabase
    .from("tidy_point_logs")
    .select(
      "id, points, kind, reason, task_id, vault_item_id, weekly_task_id, created_at",
    )
    .eq("user_id", userId)
    .gt("points", 0)
    .in("kind", [...RECENT_POINT_WIN_KINDS])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logSupabaseError("fetchRecentPointWins", error);
    return [];
  }

  return (data ?? []) as TidyPointWin[];
}

/** Client refresh of the Tidy Guild “Recent point wins” list. */
export async function fetchRecentPointWins(
  supabase: SupabaseClient,
  limit = 20,
): Promise<TidyPointWin[]> {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return [];
  }
  return fetchRecentPointWinsForUser(supabase, user.id, limit);
}

async function fetchAnytimeClaimCounts(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("tidy_point_logs")
    .select("task_id")
    .eq("user_id", userId)
    .eq("kind", "anytime_claim")
    .not("task_id", "is", null);

  if (error) {
    logSupabaseError("fetchAnytimeClaimCounts", error);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.task_id as string | null;
    if (!id) continue;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export async function sumTidyPointBalance(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("tidy_point_logs")
    .select("points, delta")
    .eq("user_id", userId);

  if (error) {
    logSupabaseError("sumTidyPointBalance", error);
    return 0;
  }

  const total = (data ?? []).reduce(
    (sum, row) => sum + pointLogRowAmount(row),
    0,
  );
  return Math.max(0, total);
}

export async function fetchTidyGuildSnapshot(
  supabase: SupabaseClient,
): Promise<{ data: TidyGuildSnapshot | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      data: null,
      error: authError
        ? ({ message: authError.message, code: authError.name } as PostgrestError)
        : null,
    };
  }

  const serverNow = new Date();
  const referenceNowIso = serverNow.toISOString();
  const todayDateIso = toDateString(serverNow);
  const defaultWeekStart = toDateString(getMondayOfWeek(serverNow));

  const [
    tasksRes,
    rewardsRes,
    pointBalance,
    anytimeClaimCounts,
    recentPointWins,
    weekPlanRes,
    habitsRes,
  ] = await Promise.all([
    supabase
      .from("tidy_tasks")
      .select(TASK_SELECT)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .returns<TidyTask[]>(),
    supabase
      .from("tidy_rewards")
      .select(REWARD_SELECT)
      .eq("user_id", user.id)
      .order("points_cost", { ascending: true })
      .returns<TidyReward[]>(),
    sumTidyPointBalance(supabase, user.id),
    fetchAnytimeClaimCounts(supabase, user.id),
    fetchRecentPointWinsForUser(supabase, user.id),
    fetchCurrentWeekPlanForTidy(supabase),
    fetchTidyHabitsForUser(supabase),
  ]);

  if (tasksRes.error) {
    logSupabaseError("fetchTidyGuildSnapshot tasks", tasksRes.error);
    return { data: null, error: tasksRes.error };
  }
  if (rewardsRes.error) {
    logSupabaseError("fetchTidyGuildSnapshot rewards", rewardsRes.error);
    return { data: null, error: rewardsRes.error };
  }

  const plan = weekPlanRes.plan;
  const weekStart = plan?.week_start ?? defaultWeekStart;
  const weeklySchedule = plan
    ? buildTidyWeeklyScheduleMap(plan.days, plan.week_start)
    : {};

  return {
    data: {
      tasks: (tasksRes.data ?? []).map(normalizeTidyTask),
      rewards: (rewardsRes.data ?? []).map(normalizeTidyReward),
      pointBalance,
      anytimeClaimCounts,
      recentPointWins,
      referenceNowIso,
      todayDateIso,
      weekStart,
      weeklySchedule,
      habits: habitsRes.error ? [] : (habitsRes.data ?? []),
    },
    error: null,
  };
}

export type UpsertTidyTaskInput = {
  id?: string;
  title: string;
  icon_key: string;
  points: number;
  recurrence: TidyRecurrence;
  micro_steps: TidyMicroStep[];
  bundle_tag?: string | null;
};

async function persistTask(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  patch: Record<string, unknown>,
) {
  return supabase
    .from("tidy_tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId)
    .select(TASK_SELECT)
    .single()
    .returns<TidyTask>();
}

export async function syncPeriodResetIfNeeded(
  supabase: SupabaseClient,
  userId: string,
  task: TidyTask,
): Promise<TidyTask> {
  if (!taskNeedsPeriodReset(task)) {
    return normalizeTidyTask(task);
  }

  const steps = resetMicroStepsForStorage(task.micro_steps);
  const result = await persistTask(supabase, userId, task.id, {
    micro_steps: steps,
    completed_at: null,
  });

  if (result.error || !result.data) {
    return normalizeTidyTask(task);
  }
  return normalizeTidyTask(result.data);
}

export async function upsertTidyTask(
  supabase: SupabaseClient,
  input: UpsertTidyTaskInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const title = input.title.trim();
  if (!title) {
    return {
      data: null,
      error: { message: "Title is required", code: "validation_error" } as PostgrestError,
    };
  }

  const payload = {
    title,
    icon_key: input.icon_key,
    points: input.points,
    recurrence: input.recurrence,
    micro_steps: input.micro_steps,
    bundle_tag: input.bundle_tag?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const result = await supabase
      .from("tidy_tasks")
      .update(payload)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .select(TASK_SELECT)
      .single()
      .returns<TidyTask>();

    if (result.error) logSupabaseError("upsertTidyTask update", result.error);
    return result.data
      ? { ...result, data: normalizeTidyTask(result.data) }
      : result;
  }

  const result = await supabase
    .from("tidy_tasks")
    .insert({ ...payload, user_id: user.id })
    .select(TASK_SELECT)
    .single()
    .returns<TidyTask>();

  if (result.error) logSupabaseError("upsertTidyTask insert", result.error);
  return result.data
    ? { ...result, data: normalizeTidyTask(result.data) }
    : result;
}

export async function fetchTidyTaskById(
  supabase: SupabaseClient,
  taskId: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("tidy_tasks")
    .select(TASK_SELECT)
    .eq("id", taskId)
    .eq("user_id", user.id)
    .maybeSingle()
    .returns<TidyTask>();

  if (error) {
    logSupabaseError("fetchTidyTaskById", error);
    return { data: null, error };
  }

  return {
    data: data ? normalizeTidyTask(data) : null,
    error: null,
  };
}

export async function deleteTidyTask(supabase: SupabaseClient, taskId: string) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { error: authError };
  }

  const result = await supabase
    .from("tidy_tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (result.error) logSupabaseError("deleteTidyTask", result.error);
  return result;
}

async function logAnytimeClaim(
  supabase: SupabaseClient,
  userId: string,
  task: TidyTask,
  points: number,
  options?: { created_at?: string; touchTask?: boolean },
) {
  const logRes = await insertTidyPointLog(supabase, {
    user_id: userId,
    points,
    kind: "anytime_claim",
    task_id: task.id,
    ...(options?.created_at ? { created_at: options.created_at } : {}),
  });

  if (logRes.error) {
    return { error: logRes.error };
  }

  if (options?.touchTask === false) {
    return { task, error: null };
  }

  const touchRes = await persistTask(supabase, userId, task.id, {});
  if (touchRes.error || !touchRes.data) {
    return { error: touchRes.error };
  }

  return { task: normalizeTidyTask(touchRes.data), error: null };
}

async function completeParentTask(
  supabase: SupabaseClient,
  userId: string,
  task: TidyTask,
) {
  if (task.recurrence === "anytime") {
    const steps = resetMicroStepsForStorage(task.micro_steps);
    const updateRes = await persistTask(supabase, userId, task.id, {
      micro_steps: steps,
    });

    if (updateRes.error || !updateRes.data) {
      return {
        task,
        skipped: false,
        error: updateRes.error ?? null,
      };
    }

    const claim = await logAnytimeClaim(
      supabase,
      userId,
      normalizeTidyTask(updateRes.data),
      task.points,
    );
    if (claim.error) {
      return { task, skipped: false, error: claim.error };
    }

    return {
      task: claim.task ?? normalizeTidyTask(updateRes.data),
      skipped: false,
      error: null,
    };
  }

  const alreadyDone = isTaskEffectivelyComplete(
    task.recurrence,
    task.completed_at,
  );
  if (alreadyDone) {
    return { task, skipped: true, error: null as PostgrestError | null };
  }

  const updateRes = await persistTask(supabase, userId, task.id, {
    completed_at: new Date().toISOString(),
  });

  if (updateRes.error || !updateRes.data) {
    return {
      task,
      skipped: false,
      error: updateRes.error ?? null,
    };
  }

  const logRes = await insertTidyPointLog(supabase, {
    user_id: userId,
    points: task.points,
    kind: "task_complete",
    task_id: task.id,
  });

  if (logRes.error) {
    return { task: normalizeTidyTask(updateRes.data), skipped: false, error: logRes.error };
  }

  return {
    task: normalizeTidyTask(updateRes.data),
    skipped: false,
    error: null,
  };
}

/** Claim points for a guilt-free Anytime task (no archive / no lock). */
export async function claimTidyAnytimeTask(
  supabase: SupabaseClient,
  task: TidyTask,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, balance: 0, error: authError };
  }

  if (task.recurrence !== "anytime") {
    return {
      data: null,
      balance: 0,
      error: {
        message: "Not an Anytime task",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const current = normalizeTidyTask(task);
  const steps = current.micro_steps ?? [];
  if (steps.length > 0) {
    const open = steps.some((s) => !s.is_completed);
    if (open) {
      return {
        data: null,
        balance: 0,
        error: {
          message: "Finish micro-steps first",
          code: "validation_error",
        } as PostgrestError,
      };
    }
  }

  const claim = await logAnytimeClaim(
    supabase,
    user.id,
    current,
    current.points,
  );

  if (claim.error) {
    return { data: null, balance: 0, error: claim.error };
  }

  let nextTask = claim.task ?? current;
  if (steps.length > 0) {
    const resetRes = await persistTask(supabase, user.id, current.id, {
      micro_steps: resetMicroStepsForStorage(steps),
    });
    if (resetRes.data) {
      nextTask = normalizeTidyTask(resetRes.data);
    }
  }

  const balance = await sumTidyPointBalance(supabase, user.id);
  return { data: nextTask, balance, error: null };
}

export type LogTidyQuestBackdateInput = {
  task: TidyTask;
  /** Local calendar YYYY-MM-DD */
  dateYmd: string;
  created_at: string;
};

/** Credit points for a past day without changing today's quest completion state. */
export async function logTidyQuestBackdate(
  supabase: SupabaseClient,
  input: LogTidyQuestBackdateInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, balance: 0, error: authError };
  }

  const task = normalizeTidyTask(input.task);
  const points = Math.max(1, Math.floor(task.points));
  const kind =
    task.recurrence === "anytime" ? "anytime_claim" : "task_complete";
  const reason = task.title.trim() || "Tidy quest";

  const logRes = await insertTidyPointLog(supabase, {
    user_id: user.id,
    points,
    kind,
    task_id: task.id,
    reason,
    created_at: input.created_at,
  });

  if (logRes.error) {
    return { data: null, balance: 0, error: logRes.error };
  }

  const balance = await sumTidyPointBalance(supabase, user.id);
  return { data: { points, dateYmd: input.dateYmd, kind }, balance, error: null };
}

export type LogTidyQuickWinInput = {
  title: string;
  points: number;
  keepInAnytimeMenu: boolean;
  /** Local-noon ISO for the chosen calendar day. */
  created_at?: string;
};

export async function logTidyQuickWin(
  supabase: SupabaseClient,
  input: LogTidyQuickWinInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      data: null,
      balance: 0,
      newTask: null as TidyTask | null,
      error: authError,
    };
  }

  const title = input.title.trim();
  if (!title) {
    return {
      data: null,
      balance: 0,
      newTask: null,
      error: {
        message: "Title is required",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const points = Math.max(1, Math.floor(input.points));

  if (!input.keepInAnytimeMenu) {
    const logRes = await insertTidyPointLog(supabase, {
      user_id: user.id,
      points,
      kind: "ad_hoc_win",
      task_id: null,
      reason: title,
      ...(input.created_at ? { created_at: input.created_at } : {}),
    });

    if (logRes.error) {
      return {
        data: null,
        balance: 0,
        newTask: null,
        error: logRes.error,
      };
    }

    const balance = await sumTidyPointBalance(supabase, user.id);
    return { data: { points }, balance, newTask: null, error: null };
  }

  const insertRes = await supabase
    .from("tidy_tasks")
    .insert({
      user_id: user.id,
      title,
      icon_key: "sparkles",
      points,
      recurrence: "anytime",
      micro_steps: [],
      bundle_tag: null,
    })
    .select(TASK_SELECT)
    .single()
    .returns<TidyTask>();

  if (insertRes.error || !insertRes.data) {
    logSupabaseError("logTidyQuickWin insert task", insertRes.error);
    return {
      data: null,
      balance: 0,
      newTask: null,
      error: insertRes.error,
    };
  }

  const task = normalizeTidyTask(insertRes.data);
  const claim = await logAnytimeClaim(supabase, user.id, task, points, {
    created_at: input.created_at,
    touchTask: true,
  });
  if (claim.error) {
    return { data: null, balance: 0, newTask: task, error: claim.error };
  }

  const balance = await sumTidyPointBalance(supabase, user.id);
  return {
    data: { points, taskId: task.id },
    balance,
    newTask: claim.task ?? task,
    error: null,
  };
}

export async function toggleTidyMicroStep(
  supabase: SupabaseClient,
  task: TidyTask,
  stepId: string,
  complete: boolean,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, balance: 0, error: authError };
  }

  let current = await syncPeriodResetIfNeeded(supabase, user.id, task);
  const steps = [...current.micro_steps];
  const index = steps.findIndex((s) => s.id === stepId);
  if (index === -1) {
    return {
      data: null,
      balance: 0,
      error: { message: "Step not found", code: "validation_error" } as PostgrestError,
    };
  }

  const step = steps[index]!;
  if (step.is_completed === complete) {
    const balance = await sumTidyPointBalance(supabase, user.id);
    return { data: current, balance, error: null };
  }

  steps[index] = { ...step, is_completed: complete };

  const updateRes = await persistTask(supabase, user.id, current.id, {
    micro_steps: steps,
  });

  if (updateRes.error || !updateRes.data) {
    return { data: null, balance: 0, error: updateRes.error };
  }

  current = normalizeTidyTask(updateRes.data);

  const stepPoints = step.points;
  const logRes = await insertTidyPointLog(supabase, {
    user_id: user.id,
    points: complete ? stepPoints : -stepPoints,
    kind: complete ? "micro_step" : "micro_step_undo",
    task_id: current.id,
    step_id: stepId,
  });

  if (logRes.error) {
    return { data: null, balance: 0, error: logRes.error };
  }

  if (complete && allMicroStepsComplete(current.micro_steps)) {
    const parentResult = await completeParentTask(supabase, user.id, current);
    if (parentResult.task) {
      current = parentResult.task;
    }
  }

  const balance = await sumTidyPointBalance(supabase, user.id);
  return { data: current, balance, error: null };
}

export async function toggleTidyTaskComplete(
  supabase: SupabaseClient,
  task: TidyTask,
  complete: boolean,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, balance: 0, error: authError };
  }

  if (task.recurrence === "anytime") {
    if (!complete) {
      const balance = await sumTidyPointBalance(supabase, user.id);
      return { data: normalizeTidyTask(task), balance, error: null };
    }
    return claimTidyAnytimeTask(supabase, task);
  }

  let current = await syncPeriodResetIfNeeded(supabase, user.id, task);

  const steps = current.micro_steps ?? [];
  let nextSteps = steps;

  if (complete) {
    nextSteps = steps.map((s) => ({ ...s, is_completed: true }));
  } else if (
    current.recurrence !== "one_off" &&
    current.recurrence !== "side_quests"
  ) {
    nextSteps = resetMicroStepsForStorage(steps);
  }

  const completed_at = complete ? new Date().toISOString() : null;

  const updateRes = await persistTask(supabase, user.id, current.id, {
    completed_at,
    micro_steps: nextSteps,
  });

  if (updateRes.error || !updateRes.data) {
    return { data: null, balance: 0, error: updateRes.error };
  }

  current = normalizeTidyTask(updateRes.data);

  const logRes = await insertTidyPointLog(supabase, {
    user_id: user.id,
    points: complete ? current.points : -current.points,
    kind: complete ? "task_complete" : "task_undo",
    task_id: current.id,
  });

  if (logRes.error) {
    return { data: null, balance: 0, error: logRes.error };
  }

  const balance = await sumTidyPointBalance(supabase, user.id);
  return { data: current, balance, error: null };
}

export type UpsertTidyRewardInput = {
  id?: string;
  title: string;
  points_cost: number;
  image_path?: string | null;
  link_url?: string | null;
  is_goal: boolean;
  is_repeatable: boolean;
  tier: TidyRewardTier;
  is_mystery: boolean;
};

export async function upsertTidyReward(
  supabase: SupabaseClient,
  input: UpsertTidyRewardInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const title = input.title.trim();
  if (!title) {
    return {
      data: null,
      error: { message: "Title is required", code: "validation_error" } as PostgrestError,
    };
  }

  if (input.is_goal) {
    await supabase
      .from("tidy_rewards")
      .update({ is_goal: false })
      .eq("user_id", user.id);
  }

  const payload = {
    title,
    points_cost: input.points_cost,
    image_path: input.image_path ?? null,
    link_url: input.link_url?.trim() || null,
    is_goal: input.is_goal,
    is_repeatable: input.is_repeatable,
    tier: input.tier,
    is_mystery: input.is_mystery,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const result = await supabase
      .from("tidy_rewards")
      .update(payload)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .select(REWARD_SELECT)
      .single()
      .returns<TidyReward>();

    if (result.error) logSupabaseError("upsertTidyReward update", result.error);
    return result.data
      ? { ...result, data: normalizeTidyReward(result.data) }
      : result;
  }

  const result = await supabase
    .from("tidy_rewards")
    .insert({ ...payload, user_id: user.id })
    .select(REWARD_SELECT)
    .single()
    .returns<TidyReward>();

  if (result.error) logSupabaseError("upsertTidyReward insert", result.error);
  return result.data
    ? { ...result, data: normalizeTidyReward(result.data) }
    : result;
}

export async function setTidyRewardGoal(
  supabase: SupabaseClient,
  rewardId: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  await supabase
    .from("tidy_rewards")
    .update({ is_goal: false })
    .eq("user_id", user.id);

  const result = await supabase
    .from("tidy_rewards")
    .update({ is_goal: true, updated_at: new Date().toISOString() })
    .eq("id", rewardId)
    .eq("user_id", user.id)
    .select(REWARD_SELECT)
    .single()
    .returns<TidyReward>();

  if (result.error) logSupabaseError("setTidyRewardGoal", result.error);
  return result.data
    ? { ...result, data: normalizeTidyReward(result.data) }
    : result;
}

export async function redeemTidyReward(
  supabase: SupabaseClient,
  reward: TidyReward,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, balance: 0, error: authError };
  }

  const balance = await sumTidyPointBalance(supabase, user.id);
  if (balance < reward.points_cost) {
    return {
      data: null,
      balance,
      error: {
        message: "Not enough points",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  if (!reward.is_repeatable && reward.redeemed_count > 0) {
    return {
      data: null,
      balance,
      error: {
        message: "Reward already redeemed",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const updateRes = await supabase
    .from("tidy_rewards")
    .update({
      redeemed_count: reward.redeemed_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reward.id)
    .eq("user_id", user.id)
    .select(REWARD_SELECT)
    .single()
    .returns<TidyReward>();

  if (updateRes.error) {
    logSupabaseError("redeemTidyReward update", updateRes.error);
    return { data: null, balance, error: updateRes.error };
  }

  const logRes = await insertTidyPointLog(supabase, {
    user_id: user.id,
    points: -reward.points_cost,
    kind: "redeem",
    reward_id: reward.id,
  });

  if (logRes.error) {
    return { data: null, balance, error: logRes.error };
  }

  const newBalance = await sumTidyPointBalance(supabase, user.id);
  return {
    data: updateRes.data ? normalizeTidyReward(updateRes.data) : null,
    balance: newBalance,
    error: null,
  };
}

export async function openTidyMysteryTreat(
  supabase: SupabaseClient,
  spinCost: number,
  mysteryRewards: TidyReward[],
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, balance: 0, error: authError };
  }

  const eligible = mysteryRewards.filter(
    (r) => r.is_mystery && (r.is_repeatable || r.redeemed_count === 0),
  );

  if (eligible.length < 2) {
    return {
      data: null,
      balance: await sumTidyPointBalance(supabase, user.id),
      error: {
        message: "Tag at least 2 repeatable or unredeemed rewards as Mystery items.",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const balance = await sumTidyPointBalance(supabase, user.id);
  if (balance < spinCost) {
    return {
      data: null,
      balance,
      error: {
        message: "Not enough points for mystery spin",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const logRes = await insertTidyPointLog(supabase, {
    user_id: user.id,
    points: -spinCost,
    kind: "mystery_spin",
  });

  if (logRes.error) {
    return { data: null, balance, error: logRes.error };
  }

  const winner = eligible[Math.floor(Math.random() * eligible.length)]!;

  const updateRes = await supabase
    .from("tidy_rewards")
    .update({
      redeemed_count: winner.redeemed_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", winner.id)
    .eq("user_id", user.id)
    .select(REWARD_SELECT)
    .single()
    .returns<TidyReward>();

  const newBalance = await sumTidyPointBalance(supabase, user.id);

  return {
    data: {
      reward: updateRes.data
        ? normalizeTidyReward(updateRes.data)
        : winner,
    },
    balance: newBalance,
    error: null,
  };
}

export async function deleteTidyReward(
  supabase: SupabaseClient,
  rewardId: string,
) {
  const { removeTidyRewardFromShop } = await import("./tidy-reward-bridge");
  return removeTidyRewardFromShop(supabase, rewardId);
}