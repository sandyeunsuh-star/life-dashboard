import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { DayKey, WeeklyTask } from "@/lib/weekly/constants";
import { DAY_KEYS } from "@/lib/weekly/constants";
import { resetMicroStepsForStorage } from "@/lib/tidy/micro-steps";
import { logSupabaseError } from "../errors";
import { pointLogRowAmount } from "../tidy-point-log";
import { requireAuthUser } from "../require-auth-user";
import type { TidyPointLog, TidyTask } from "../types/tidy";
import {
  ensureCurrentWeekPlan,
  upsertWeeklyPlanDays,
} from "./weekly-plans";
import {
  fetchTidyTaskById,
  sumTidyPointBalance,
  syncPeriodResetIfNeeded,
} from "./tidy";
import {
  syncTidyCompletionToWeekly,
  unstampAnytimeClaimOnWeekly,
} from "./weekly-tidy-sync";

const UNDOABLE_WIN_KINDS = new Set([
  "weekly_task",
  "vault_skip",
  "task_complete",
  "anytime_claim",
  "ad_hoc_win",
]);

async function persistTaskCompletionRevert(
  supabase: SupabaseClient,
  userId: string,
  task: TidyTask,
): Promise<{ data: TidyTask | null; error: PostgrestError | null }> {
  if (task.recurrence === "anytime") {
    return { data: task, error: null };
  }

  let current = await syncPeriodResetIfNeeded(supabase, userId, task);
  const steps = current.micro_steps ?? [];
  const nextSteps =
    current.recurrence !== "one_off"
      ? resetMicroStepsForStorage(steps)
      : steps;

  const { data, error } = await supabase
    .from("tidy_tasks")
    .update({
      completed_at: null,
      micro_steps: nextSteps,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .eq("user_id", userId)
    .select(
      "id, user_id, title, icon_key, points, recurrence, completed_at, micro_steps, bundle_tag, created_at, updated_at",
    )
    .single()
    .returns<TidyTask>();

  if (error) {
    logSupabaseError("persistTaskCompletionRevert", error);
    return { data: null, error };
  }

  const next = data as TidyTask;
  await syncTidyCompletionToWeekly(supabase, next, false);
  return { data: next, error: null };
}

async function uncheckWeeklyTaskWithoutPoints(
  supabase: SupabaseClient,
  userId: string,
  weeklyTaskId: string,
  tidyTaskId: string | null,
) {
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

  let foundDay: DayKey | null = null;
  let foundTask: WeeklyTask | null = null;
  for (const day of DAY_KEYS) {
    const hit = (planRes.data.days[day] ?? []).find((t) => t.id === weeklyTaskId);
    if (hit) {
      foundDay = day;
      foundTask = hit;
      break;
    }
  }
  if (!foundDay || !foundTask) {
    return { error: null as PostgrestError | null };
  }

  if (tidyTaskId) {
    const fetched = await fetchTidyTaskById(supabase, tidyTaskId);
    const tidy = fetched.data;
    if (tidy && tidy.recurrence !== "anytime") {
      const rev = await persistTaskCompletionRevert(supabase, userId, tidy);
      if (rev.error) return { error: rev.error };
    }
  }

  const days = { ...planRes.data.days };
  const list = [...(days[foundDay] ?? [])];
  const idx = list.findIndex((t) => t.id === weeklyTaskId);
  if (idx < 0) return { error: null };

  list[idx] = { ...list[idx]!, checked: false };
  days[foundDay] = list;

  const persist = await upsertWeeklyPlanDays(
    supabase,
    planRes.data.id,
    days,
  );
  if (persist.error) {
    logSupabaseError("uncheckWeeklyTaskWithoutPoints", persist.error);
    return { error: persist.error };
  }
  return { error: null };
}

async function fetchOwnedPointLog(
  supabase: SupabaseClient,
  userId: string,
  logId: string,
) {
  const { data, error } = await supabase
    .from("tidy_point_logs")
    .select(
      "id, user_id, points, delta, kind, task_id, weekly_task_id, vault_item_id, reason, created_at",
    )
    .eq("id", logId)
    .eq("user_id", userId)
    .maybeSingle()
    .returns<TidyPointLog>();

  if (error) {
    logSupabaseError("fetchOwnedPointLog", error);
    return { log: null, error };
  }
  return { log: data, error: null };
}

function isUndoablePositiveWin(log: TidyPointLog): boolean {
  if (!UNDOABLE_WIN_KINDS.has(log.kind)) return false;
  return pointLogRowAmount(log) > 0;
}

export type UndoTidyPointResult = {
  balance: number;
  error: PostgrestError | null;
  tidyTask: TidyTask | null;
  anytimeClaimCount: number | null;
};

export async function undoTidyPointWin(
  supabase: SupabaseClient,
  logId: string,
): Promise<UndoTidyPointResult> {
  const empty: UndoTidyPointResult = {
    balance: 0,
    error: null,
    tidyTask: null,
    anytimeClaimCount: null,
  };

  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      ...empty,
      error: authError
        ? ({ message: authError.message, code: authError.name } as PostgrestError)
        : null,
    };
  }

  const { log, error: fetchError } = await fetchOwnedPointLog(
    supabase,
    user.id,
    logId,
  );
  if (fetchError) return { ...empty, error: fetchError };
  if (!log) {
    return {
      ...empty,
      error: {
        message: "Point entry not found",
        code: "not_found",
      } as PostgrestError,
    };
  }
  if (!isUndoablePositiveWin(log)) {
    return {
      ...empty,
      error: {
        message: "This entry cannot be undone",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  let tidyTask: TidyTask | null = null;
  let anytimeClaimCount: number | null = null;

  if (log.kind === "weekly_task" && log.weekly_task_id) {
    const sync = await uncheckWeeklyTaskWithoutPoints(
      supabase,
      user.id,
      log.weekly_task_id,
      log.task_id,
    );
    if (sync.error) {
      return {
        ...empty,
        balance: await sumTidyPointBalance(supabase, user.id),
        error: sync.error as PostgrestError,
      };
    }
  } else if (log.kind === "task_complete" && log.task_id) {
    const fetched = await fetchTidyTaskById(supabase, log.task_id);
    if (fetched.data && fetched.data.recurrence !== "anytime") {
      const rev = await persistTaskCompletionRevert(
        supabase,
        user.id,
        fetched.data,
      );
      if (rev.error) {
        return {
          ...empty,
          balance: await sumTidyPointBalance(supabase, user.id),
          error: rev.error,
        };
      }
      tidyTask = rev.data;
    }
  } else if (log.kind === "anytime_claim" && log.task_id) {
    const fetched = await fetchTidyTaskById(supabase, log.task_id);
    if (fetched.data) {
      const unstamp = await unstampAnytimeClaimOnWeekly(
        supabase,
        fetched.data,
      );
      if (unstamp.error) {
        return {
          ...empty,
          balance: await sumTidyPointBalance(supabase, user.id),
          error: unstamp.error as PostgrestError,
        };
      }
      tidyTask = fetched.data;
    }
  }

  const del = await supabase
    .from("tidy_point_logs")
    .delete()
    .eq("id", log.id)
    .eq("user_id", user.id);

  if (del.error) {
    logSupabaseError("undoTidyPointWin delete", del.error);
    return {
      ...empty,
      balance: await sumTidyPointBalance(supabase, user.id),
      error: del.error,
    };
  }

  const balance = await sumTidyPointBalance(supabase, user.id);

  if (log.kind === "anytime_claim" && log.task_id) {
    const { count } = await supabase
      .from("tidy_point_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("kind", "anytime_claim")
      .eq("task_id", log.task_id);
    anytimeClaimCount = count ?? 0;
  }

  return { balance, error: null, tidyTask, anytimeClaimCount };
}

export async function undoLatestAnytimeClaim(
  supabase: SupabaseClient,
  task: TidyTask,
): Promise<UndoTidyPointResult> {
  const empty: UndoTidyPointResult = {
    balance: 0,
    error: null,
    tidyTask: null,
    anytimeClaimCount: null,
  };

  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      ...empty,
      error: authError
        ? ({ message: authError.message, code: authError.name } as PostgrestError)
        : null,
    };
  }

  if (task.recurrence !== "anytime") {
    return {
      ...empty,
      error: {
        message: "Not an Anytime task",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const { data: logs, error: listError } = await supabase
    .from("tidy_point_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", "anytime_claim")
    .eq("task_id", task.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (listError) {
    logSupabaseError("undoLatestAnytimeClaim list", listError);
    return { ...empty, error: listError };
  }

  const latest = logs?.[0];
  if (!latest?.id) {
    return {
      ...empty,
      error: {
        message: "No claim to undo",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const unstamp = await unstampAnytimeClaimOnWeekly(supabase, task);
  if (unstamp.error) {
    return {
      ...empty,
      balance: await sumTidyPointBalance(supabase, user.id),
      error: unstamp.error as PostgrestError,
    };
  }

  const del = await supabase
    .from("tidy_point_logs")
    .delete()
    .eq("id", latest.id)
    .eq("user_id", user.id);

  if (del.error) {
    logSupabaseError("undoLatestAnytimeClaim delete", del.error);
    return {
      ...empty,
      balance: await sumTidyPointBalance(supabase, user.id),
      error: del.error,
    };
  }

  const balance = await sumTidyPointBalance(supabase, user.id);
  const { count } = await supabase
    .from("tidy_point_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("kind", "anytime_claim")
    .eq("task_id", task.id);

  return {
    balance,
    error: null,
    tidyTask: task,
    anytimeClaimCount: count ?? 0,
  };
}