import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { createdAtLocalNoonIso } from "@/lib/tidy/backdate-dates";
import {
  HABIT_DAILY_POINTS,
  HABIT_INCUBATOR_MAX,
  HABIT_TIER_OPTIONS,
  type HabitTier,
} from "@/lib/tidy/habit-constants";
import {
  computeHabitStreakMeta,
  normalizeCheckInDates,
} from "@/lib/tidy/habit-streak";
import { startOfLocalDay } from "@/lib/tidy/task-reset";
import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import { insertTidyPointLog } from "../tidy-point-log";
import type { TidyHabitRow } from "../types/tidy-habit";
import { sumTidyPointBalance } from "./tidy";

const HABIT_SELECT =
  "id, user_id, title, anchor_cue, tier, target_days, daily_points, graduation_points, status, check_in_dates, established_at, created_at, updated_at";

function normalizeHabit(row: Record<string, unknown>): TidyHabitRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    anchor_cue: (row.anchor_cue as string | null) ?? null,
    tier: row.tier as HabitTier,
    target_days: row.target_days as number,
    daily_points: row.daily_points as number,
    graduation_points: row.graduation_points as number,
    status: row.status as TidyHabitRow["status"],
    check_in_dates: normalizeCheckInDates(row.check_in_dates),
    established_at: (row.established_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function fetchTidyHabitsForUser(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("tidy_habits")
    .select(HABIT_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .returns<TidyHabitRow[]>();

  if (error) {
    logSupabaseError("fetchTidyHabitsForUser", error);
    return { data: null, error };
  }

  return {
    data: (data ?? []).map((r) => normalizeHabit(r as Record<string, unknown>)),
    error: null,
  };
}

export type UpsertTidyHabitInput = {
  id?: string;
  title: string;
  anchor_cue?: string | null;
  tier: HabitTier;
};

export async function upsertTidyHabit(
  supabase: SupabaseClient,
  input: UpsertTidyHabitInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const title = input.title.trim();
  if (!title) {
    return {
      data: null,
      error: {
        message: "Habit name is required",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const tierMeta =
    HABIT_TIER_OPTIONS.find((t) => t.tier === input.tier) ??
    HABIT_TIER_OPTIONS[0];

  if (!input.id) {
    const { count, error: countError } = await supabase
      .from("tidy_habits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "incubating");

    if (countError) {
      logSupabaseError("upsertTidyHabit count", countError);
      return { data: null, error: countError };
    }
    if ((count ?? 0) >= HABIT_INCUBATOR_MAX) {
      return {
        data: null,
        error: {
          message: `Focus on up to ${HABIT_INCUBATOR_MAX} incubating habits at a time.`,
          code: "habit_cap",
        } as PostgrestError,
      };
    }
  }

  const payload = {
    user_id: user.id,
    title,
    anchor_cue: input.anchor_cue?.trim() || null,
    tier: tierMeta.tier,
    target_days: tierMeta.targetDays,
    daily_points: HABIT_DAILY_POINTS,
    graduation_points: tierMeta.graduationPoints,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("tidy_habits")
      .update(payload)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .eq("status", "incubating")
      .select(HABIT_SELECT)
      .single();

    if (error) {
      logSupabaseError("upsertTidyHabit update", error);
      return { data: null, error };
    }
    return { data: normalizeHabit(data as Record<string, unknown>), error: null };
  }

  const { data, error } = await supabase
    .from("tidy_habits")
    .insert({ ...payload, status: "incubating", check_in_dates: [] })
    .select(HABIT_SELECT)
    .single();

  if (error) {
    logSupabaseError("upsertTidyHabit insert", error);
    return { data: null, error };
  }

  return { data: normalizeHabit(data as Record<string, unknown>), error: null };
}

export async function deleteTidyHabit(
  supabase: SupabaseClient,
  habitId: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) return { error: authError };

  const result = await supabase
    .from("tidy_habits")
    .delete()
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (result.error) logSupabaseError("deleteTidyHabit", result.error);
  return result;
}

async function persistHabitDates(
  supabase: SupabaseClient,
  userId: string,
  habit: TidyHabitRow,
  dates: string[],
  extra?: { status?: TidyHabitRow["status"]; established_at?: string | null },
) {
  const { data, error } = await supabase
    .from("tidy_habits")
    .update({
      check_in_dates: dates,
      updated_at: new Date().toISOString(),
      ...(extra?.status ? { status: extra.status } : {}),
      ...(extra?.established_at !== undefined
        ? { established_at: extra.established_at }
        : {}),
    })
    .eq("id", habit.id)
    .eq("user_id", userId)
    .select(HABIT_SELECT)
    .single();

  if (error || !data) {
    logSupabaseError("persistHabitDates", error);
    return { data: null, error };
  }
  return { data: normalizeHabit(data as Record<string, unknown>), error: null };
}

export type HabitCheckInResult = {
  habit: TidyHabitRow;
  balance: number;
  graduated: boolean;
  graduationPoints: number;
  dailyPoints: number;
  dateYmd: string;
};

async function establishHabit(
  supabase: SupabaseClient,
  userId: string,
  habit: TidyHabitRow,
  dates: string[],
) {
  const gradRes = await insertTidyPointLog(supabase, {
    user_id: userId,
    points: habit.graduation_points,
    kind: "habit_graduation",
    habit_id: habit.id,
    reason: `ESTABLISHED Habit (${habit.target_days}d): ${habit.title}`,
  });

  if (gradRes.error) {
    return { data: null, error: gradRes.error };
  }

  const establishedAt = new Date().toISOString();
  return persistHabitDates(supabase, userId, habit, dates, {
    status: "established",
    established_at: establishedAt,
  });
}

export async function habitCheckIn(
  supabase: SupabaseClient,
  habit: TidyHabitRow,
  dateYmd: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  if (habit.status !== "incubating") {
    return {
      data: null,
      error: {
        message: "Habit is already established",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const dates = normalizeCheckInDates(habit.check_in_dates);
  if (dates.includes(dateYmd)) {
    return {
      data: null,
      error: {
        message: "Already checked in for that day",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const { streak } = computeHabitStreakMeta([...dates, dateYmd]);
  const dayLabel = streak > 0 ? streak : dates.length + 1;
  const reason = `Habit Day ${dayLabel}/${habit.target_days}: ${habit.title}`;

  const logRes = await insertTidyPointLog(supabase, {
    user_id: user.id,
    points: habit.daily_points,
    kind: "habit_checkin",
    habit_id: habit.id,
    reason,
    created_at: createdAtLocalNoonIso(dateYmd),
  });

  if (logRes.error) {
    return { data: null, error: logRes.error };
  }

  const nextDates = normalizeCheckInDates([...dates, dateYmd]);
  let saved: TidyHabitRow | null = null;
  let graduated = false;

  if (streak >= habit.target_days) {
    const est = await establishHabit(supabase, user.id, habit, nextDates);
    if (est.error || !est.data) {
      return { data: null, error: est.error };
    }
    saved = est.data;
    graduated = true;
  } else {
    const persist = await persistHabitDates(
      supabase,
      user.id,
      habit,
      nextDates,
    );
    if (persist.error || !persist.data) {
      return { data: null, error: persist.error };
    }
    saved = persist.data;
  }

  const balance = await sumTidyPointBalance(supabase, user.id);
  const result: HabitCheckInResult = {
    habit: saved,
    balance,
    graduated,
    graduationPoints: habit.graduation_points,
    dailyPoints: habit.daily_points,
    dateYmd,
  };

  return { data: result, error: null };
}

export async function habitUncheckIn(
  supabase: SupabaseClient,
  habit: TidyHabitRow,
  dateYmd: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  if (habit.status !== "incubating") {
    return {
      data: null,
      error: {
        message: "Cannot undo check-in on established habits",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const dates = normalizeCheckInDates(habit.check_in_dates);
  if (!dates.includes(dateYmd)) {
    return {
      data: null,
      error: {
        message: "No check-in for that day",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const dayStart = startOfLocalDay(
    new Date(`${dateYmd}T12:00:00`),
  ).toISOString();
  const dayEnd = new Date(startOfLocalDay(
    new Date(`${dateYmd}T12:00:00`),
  ));
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { data: logs, error: findError } = await supabase
    .from("tidy_point_logs")
    .select("id, points, delta")
    .eq("user_id", user.id)
    .eq("habit_id", habit.id)
    .eq("kind", "habit_checkin")
    .gte("created_at", dayStart)
    .lt("created_at", dayEnd.toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (findError) {
    logSupabaseError("habitUncheckIn find", findError);
    return { data: null, error: findError };
  }

  const log = logs?.[0];
  if (log?.id) {
    const del = await supabase
      .from("tidy_point_logs")
      .delete()
      .eq("id", log.id)
      .eq("user_id", user.id);
    if (del.error) {
      logSupabaseError("habitUncheckIn delete", del.error);
      return { data: null, error: del.error };
    }
  }

  const nextDates = dates.filter((d) => d !== dateYmd);
  const persist = await persistHabitDates(supabase, user.id, habit, nextDates);
  if (persist.error || !persist.data) {
    return { data: null, error: persist.error };
  }

  const balance = await sumTidyPointBalance(supabase, user.id);
  return {
    data: {
      habit: persist.data,
      balance,
      dateYmd,
      dailyPoints: habit.daily_points,
    },
    error: null,
  };
}

export async function sumHabitLifetimePoints(
  supabase: SupabaseClient,
  habitId: string,
): Promise<number> {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) return 0;

  const { data, error } = await supabase
    .from("tidy_point_logs")
    .select("points, delta, kind")
    .eq("user_id", user.id)
    .eq("habit_id", habitId)
    .in("kind", ["habit_checkin", "habit_graduation"]);

  if (error) {
    logSupabaseError("sumHabitLifetimePoints", error);
    return 0;
  }

  return (data ?? []).reduce((sum, row) => {
    const raw = row.delta ?? row.points ?? 0;
    const n = Number(raw);
    return sum + (Number.isFinite(n) ? Math.max(0, n) : 0);
  }, 0);
}