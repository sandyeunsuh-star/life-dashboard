import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_QUICK_COPY,
  type QuickCopySettings,
  type RecurringTemplate,
} from "@/lib/weekly/constants";
import {
  normalizeRecurringTemplate,
} from "@/lib/weekly/plan-helpers";

import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import type { UserSettingsRow } from "../types/user-settings";

function normalizeQuickCopy(raw: unknown): QuickCopySettings {
  const base = { ...DEFAULT_QUICK_COPY };
  if (!raw || typeof raw !== "object") return base;
  const record = raw as Record<string, unknown>;
  if (typeof record.korean_address === "string") {
    base.korean_address = record.korean_address;
  }
  if (typeof record.english_address === "string") {
    base.english_address = record.english_address;
  }
  if (typeof record.customs_id === "string") {
    base.customs_id = record.customs_id;
  }
  return base;
}

function normalizeRow(row: UserSettingsRow): UserSettingsRow {
  return {
    ...row,
    quick_copy: normalizeQuickCopy(row.quick_copy),
    recurring_template: normalizeRecurringTemplate(row.recurring_template),
  };
}

export async function getUserSettings(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id, quick_copy, recurring_template, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logSupabaseError("getUserSettings", error);
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return { data: normalizeRow(data as UserSettingsRow), error: null };
}

export async function getOrCreateUserSettings(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const existing = await getUserSettings(supabase);
  if (existing.error) return existing;
  if (existing.data) return existing;

  const { data, error } = await supabase
    .from("user_settings")
    .insert({
      user_id: user.id,
      quick_copy: DEFAULT_QUICK_COPY,
    })
    .select("user_id, quick_copy, recurring_template, updated_at")
    .single();

  if (error) {
    logSupabaseError("getOrCreateUserSettings", error);
    return { data: null, error };
  }

  return { data: normalizeRow(data as UserSettingsRow), error: null };
}

export async function updateUserQuickCopy(
  supabase: SupabaseClient,
  quickCopy: QuickCopySettings,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        quick_copy: quickCopy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("user_id, quick_copy, recurring_template, updated_at")
    .single();

  if (error) {
    logSupabaseError("updateUserQuickCopy", error);
    return { data: null, error: error as PostgrestError };
  }

  return { data: normalizeRow(data as UserSettingsRow), error: null };
}

export async function updateRecurringTemplate(
  supabase: SupabaseClient,
  template: RecurringTemplate,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        recurring_template: template,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("user_id, quick_copy, recurring_template, updated_at")
    .single();

  if (error) {
    logSupabaseError("updateRecurringTemplate", error);
    return { data: null, error: error as PostgrestError };
  }

  return { data: normalizeRow(data as UserSettingsRow), error: null };
}