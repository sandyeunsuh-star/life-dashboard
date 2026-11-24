import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { WeeklyDays } from "@/lib/weekly/constants";
import {
  addWeeks,
  getMondayOfWeek,
  parseDateString,
  toDateString,
} from "@/lib/weekly/dates";
import {
  applyRolloverToMonday,
  buildDaysFromTemplate,
  collectUncheckedTasks,
  normalizeRecurringTemplate,
  normalizeWeeklyDays,
} from "@/lib/weekly/plan-helpers";
import { prepareWeeklyDaysForStorage } from "@/lib/weekly/serialize-days";

import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import { getOrCreateUserSettings } from "./user-settings";
import type { WeeklyPlanRow } from "../types/weekly-plan";

function normalizePlan(row: WeeklyPlanRow): WeeklyPlanRow {
  return {
    ...row,
    days: normalizeWeeklyDays(row.days),
  };
}

export async function listWeeklyPlanWeekStarts(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("weekly_plans")
    .select("week_start")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false });

  if (error) {
    logSupabaseError("listWeeklyPlanWeekStarts", error);
    return { data: null, error };
  }

  const weekStarts = (data ?? []).map((r) => r.week_start as string);
  return { data: weekStarts, error: null };
}

export async function getWeeklyPlanByWeekStart(
  supabase: SupabaseClient,
  weekStart: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("weekly_plans")
    .select("id, user_id, week_start, days, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) {
    logSupabaseError("getWeeklyPlanByWeekStart", error);
    return { data: null, error };
  }

  if (!data) return { data: null, error: null };
  return { data: normalizePlan(data as WeeklyPlanRow), error: null };
}

export async function upsertWeeklyPlanDays(
  supabase: SupabaseClient,
  planId: string,
  days: WeeklyDays,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("weekly_plans")
    .update({
      days: prepareWeeklyDaysForStorage(days),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("user_id", user.id)
    .select("id, user_id, week_start, days, created_at, updated_at")
    .single();

  if (error) {
    logSupabaseError("upsertWeeklyPlanDays", error);
    return { data: null, error: error as PostgrestError };
  }

  return { data: normalizePlan(data as WeeklyPlanRow), error: null };
}

export async function ensureWeekPlanForWeekStart(
  supabase: SupabaseClient,
  weekStart: string,
) {
  const existing = await getWeeklyPlanByWeekStart(supabase, weekStart);
  if (existing.error) return existing;
  if (existing.data) return existing;

  const settings = await getOrCreateUserSettings(supabase);
  if (settings.error || !settings.data) {
    return { data: null, error: settings.error };
  }

  const template = normalizeRecurringTemplate(
    settings.data.recurring_template,
  );
  const days = buildDaysFromTemplate(template);
  return createWeeklyPlan(supabase, weekStart, days);
}

export async function ensureCurrentWeekPlan(supabase: SupabaseClient) {
  const weekStart = toDateString(getMondayOfWeek(new Date()));
  return ensureWeekPlanForWeekStart(supabase, weekStart);
}

async function createWeeklyPlan(
  supabase: SupabaseClient,
  weekStart: string,
  days: WeeklyDays,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("weekly_plans")
    .insert({
      user_id: user.id,
      week_start: weekStart,
      days,
    })
    .select("id, user_id, week_start, days, created_at, updated_at")
    .single();

  if (error) {
    logSupabaseError("createWeeklyPlan", error);
    return { data: null, error: error as PostgrestError };
  }

  return { data: normalizePlan(data as WeeklyPlanRow), error: null };
}

export type StartNextWeekOptions = {
  currentWeekStart: string;
  rollOverUnchecked: boolean;
};

export async function startNextWeek(
  supabase: SupabaseClient,
  options: StartNextWeekOptions,
) {
  const currentMonday = parseDateString(options.currentWeekStart);
  const nextMonday = addWeeks(currentMonday, 1);
  const nextWeekStart = toDateString(nextMonday);

  const existing = await getWeeklyPlanByWeekStart(supabase, nextWeekStart);
  if (existing.error) return { data: null, error: existing.error };
  if (existing.data) {
    const conflict = {
      name: "WeekExists",
      message: "Next week already exists",
      code: "week_exists",
    } as PostgrestError;
    return { data: existing.data, error: conflict };
  }

  const settings = await getOrCreateUserSettings(supabase);
  if (settings.error || !settings.data) {
    return { data: null, error: settings.error };
  }

  const template = normalizeRecurringTemplate(
    settings.data.recurring_template,
  );
  let days = buildDaysFromTemplate(template);

  if (options.rollOverUnchecked) {
    const current = await getWeeklyPlanByWeekStart(
      supabase,
      options.currentWeekStart,
    );
    if (current.data) {
      const rolled = collectUncheckedTasks(current.data.days);
      days = applyRolloverToMonday(days, rolled);
    }
  }

  return createWeeklyPlan(supabase, nextWeekStart, days);
}