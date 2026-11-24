import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { localDateKeyFromIso } from "@/lib/tidy/backdate-dates";
import {
  startOfLocalMonth,
  startOfLocalWeek,
} from "@/lib/tidy/task-reset";
import { toDateString } from "@/lib/weekly/dates";
import { pointLogRowAmount } from "../tidy-point-log";
import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import type { TidyGoalsRow, TidyGoalProgress } from "../types/tidy-goals";
import type { TidyPointLogKind } from "../types/tidy";

const EARN_KINDS: TidyPointLogKind[] = [
  "weekly_task",
  "task_complete",
  "anytime_claim",
  "micro_step",
  "vault_skip",
  "ad_hoc_win",
  "habit_checkin",
  "habit_graduation",
];

const DEFAULT_DAILY = 50;
const DEFAULT_MONTHLY = 1200;

function localMonthBounds(date = new Date()) {
  const start = startOfLocalMonth(date);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { start, end };
}

function sumEarnedLogs(
  rows: { points?: number | null; delta?: number | null; kind: string }[],
) {
  let points = 0;
  let wins = 0;
  for (const row of rows) {
    const amt = pointLogRowAmount(row);
    if (amt <= 0) continue;
    if (!EARN_KINDS.includes(row.kind as TidyPointLogKind)) continue;
    points += amt;
    wins += 1;
  }
  return { points, wins };
}

export async function ensureTidyGoals(
  supabase: SupabaseClient,
  userId: string,
): Promise<TidyGoalsRow> {
  const { data, error } = await supabase
    .from("tidy_goals")
    .select("user_id, daily_goal, monthly_goal, updated_at")
    .eq("user_id", userId)
    .maybeSingle()
    .returns<TidyGoalsRow>();

  if (error) {
    logSupabaseError("ensureTidyGoals select", error);
  }
  if (data) return data;

  const insert = await supabase
    .from("tidy_goals")
    .insert({
      user_id: userId,
      daily_goal: DEFAULT_DAILY,
      monthly_goal: DEFAULT_MONTHLY,
    })
    .select("user_id, daily_goal, monthly_goal, updated_at")
    .single()
    .returns<TidyGoalsRow>();

  if (insert.error) logSupabaseError("ensureTidyGoals insert", insert.error);
  return (
    insert.data ?? {
      user_id: userId,
      daily_goal: DEFAULT_DAILY,
      monthly_goal: DEFAULT_MONTHLY,
      updated_at: new Date().toISOString(),
    }
  );
}

export async function upsertTidyGoals(
  supabase: SupabaseClient,
  patch: { daily_goal?: number; monthly_goal?: number },
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const current = await ensureTidyGoals(supabase, user.id);
  const payload = {
    user_id: user.id,
    daily_goal: Math.max(
      1,
      Math.floor(patch.daily_goal ?? current.daily_goal),
    ),
    monthly_goal: Math.max(
      1,
      Math.floor(patch.monthly_goal ?? current.monthly_goal),
    ),
    updated_at: new Date().toISOString(),
  };

  const result = await supabase
    .from("tidy_goals")
    .upsert(payload)
    .select("user_id, daily_goal, monthly_goal, updated_at")
    .single()
    .returns<TidyGoalsRow>();

  if (result.error) logSupabaseError("upsertTidyGoals", result.error);
  return result;
}

export async function fetchTidyGoalProgress(
  supabase: SupabaseClient,
): Promise<{ data: TidyGoalProgress | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      data: null,
      error: authError
        ? ({ message: authError.message, code: authError.name } as PostgrestError)
        : null,
    };
  }

  const goals = await ensureTidyGoals(supabase, user.id);
  const now = new Date();
  const weekStart = startOfLocalWeek(now);
  const month = localMonthBounds(now);

  const { data, error } = await supabase
    .from("tidy_point_logs")
    .select("points, delta, kind, created_at")
    .eq("user_id", user.id)
    .gte("created_at", month.start.toISOString())
    .lt("created_at", new Date(month.end.getTime() + 1).toISOString());

  if (error) {
    logSupabaseError("fetchTidyGoalProgress", error);
    return { data: null, error };
  }

  const rows = data ?? [];
  const todayKey = toDateString(now);
  const weekStartKey = toDateString(weekStart);
  const todayRows = rows.filter(
    (r) => localDateKeyFromIso(r.created_at as string) === todayKey,
  );
  const weekRows = rows.filter((r) => {
    const key = localDateKeyFromIso(r.created_at as string);
    return key >= weekStartKey;
  });

  const today = sumEarnedLogs(todayRows);
  const week = sumEarnedLogs(weekRows);
  const monthSum = sumEarnedLogs(rows);

  return {
    data: {
      daily_goal: goals.daily_goal,
      monthly_goal: goals.monthly_goal,
      today_points: today.points,
      today_wins: today.wins,
      week_points: week.points,
      week_wins: week.wins,
      month_points: monthSum.points,
      month_wins: monthSum.wins,
    },
    error: null,
  };
}

export type TidyHistoryDay = {
  dateKey: string;
  label: string;
  points: number;
  wins: number;
  entries: {
    id: string;
    label: string;
    source: string;
    points: number;
    created_at: string;
  }[];
};

const KIND_SOURCE: Partial<Record<TidyPointLogKind, string>> = {
  weekly_task: "Weekly",
  task_complete: "Tidy Guild",
  anytime_claim: "Tidy Guild",
  micro_step: "Tidy Guild",
  vault_skip: "Vault",
  ad_hoc_win: "Quick win",
  habit_checkin: "Habit",
  habit_graduation: "Habit grad",
};

export async function fetchTidyPointHistoryByDay(
  supabase: SupabaseClient,
  limitDays = 30,
): Promise<TidyHistoryDay[]> {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) return [];

  const since = new Date();
  since.setDate(since.getDate() - limitDays);

  const { data, error } = await supabase
    .from("tidy_point_logs")
    .select("id, points, delta, kind, reason, created_at")
    .eq("user_id", user.id)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("fetchTidyPointHistoryByDay", error);
    return [];
  }

  const byDay = new Map<string, TidyHistoryDay>();

  for (const row of data ?? []) {
    const amt = pointLogRowAmount(row);
    if (amt <= 0) continue;
    if (!EARN_KINDS.includes(row.kind as TidyPointLogKind)) continue;

    const created = new Date(row.created_at as string);
    const dateKey = localDateKeyFromIso(created);
    const label = created.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    let bucket = byDay.get(dateKey);
    if (!bucket) {
      bucket = { dateKey, label, points: 0, wins: 0, entries: [] };
      byDay.set(dateKey, bucket);
    }

    const source =
      KIND_SOURCE[row.kind as TidyPointLogKind] ?? row.kind;
    const text =
      (row.reason as string | null)?.trim() ||
      source;

    bucket.points += amt;
    bucket.wins += 1;
    bucket.entries.push({
      id: row.id as string,
      label: text,
      source,
      points: amt,
      created_at: row.created_at as string,
    });
  }

  return [...byDay.values()].sort((a, b) =>
    b.dateKey.localeCompare(a.dateKey),
  );
}