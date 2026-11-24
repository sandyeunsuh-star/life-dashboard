import type { SupabaseClient } from "@supabase/supabase-js";

import {
  emptyCurrentsPrompts,
  type CurrentsPromptKey,
} from "@/lib/currents/constants";
import { currentPeriodYm } from "@/lib/currents/period";
import { normalizePaperOverlay } from "@/lib/currents/paper-overlay";
import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import type {
  CurrentsEntryRow,
  UpsertCurrentsEntryInput,
} from "../types/currents";

const SELECT =
  "id, user_id, period_ym, period_label, entry_title, recorded_at, mood_note, prompts, photo_urls, paper_item_id, paper_image_url, paper_title, paper_overlay, created_at, updated_at";

function normalizePrompts(raw: unknown): Partial<Record<CurrentsPromptKey, string>> {
  const base = emptyCurrentsPrompts();
  if (!raw || typeof raw !== "object") return base;
  const out = { ...base };
  for (const key of Object.keys(base) as CurrentsPromptKey[]) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "string") out[key] = v;
  }
  return out;
}

function normalizePhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u) => typeof u === "string" && u.trim()).slice(0, 4);
}

function normalizeRow(row: Record<string, unknown>): CurrentsEntryRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    period_ym: row.period_ym as string,
    period_label: row.period_label as string,
    entry_title: (row.entry_title as string | null) ?? null,
    recorded_at: row.recorded_at as string,
    mood_note: (row.mood_note as string | null) ?? null,
    prompts: normalizePrompts(row.prompts),
    photo_urls: normalizePhotos(row.photo_urls),
    paper_item_id: (row.paper_item_id as string | null) ?? null,
    paper_image_url: (row.paper_image_url as string | null) ?? null,
    paper_title: (row.paper_title as string | null) ?? null,
    paper_overlay: normalizePaperOverlay(row.paper_overlay),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function buildPayload(
  userId: string,
  input: UpsertCurrentsEntryInput,
) {
  const hasPaper = Boolean(input.paper_image_url?.trim());
  return {
    user_id: userId,
    period_ym: input.period_ym,
    period_label: input.period_label.trim(),
    entry_title: input.entry_title?.trim() || null,
    mood_note: input.mood_note?.trim() || null,
    prompts: input.prompts,
    photo_urls: input.photo_urls.slice(0, 4),
    paper_item_id: hasPaper ? input.paper_item_id ?? null : null,
    paper_image_url: hasPaper ? input.paper_image_url!.trim() : null,
    paper_title: hasPaper ? input.paper_title?.trim() || null : null,
    paper_overlay: hasPaper
      ? normalizePaperOverlay(input.paper_overlay) ?? "vellum"
      : null,
    updated_at: new Date().toISOString(),
  };
}

export async function listCurrentsEntries(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("currents_entries")
    .select(SELECT)
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false });

  if (error) {
    logSupabaseError("listCurrentsEntries", error);
    return { data: null, error };
  }

  return {
    data: (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>)),
    error: null,
  };
}

export async function hasCurrentsForMonth(
  supabase: SupabaseClient,
  periodYm = currentPeriodYm(),
): Promise<boolean> {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) return false;

  const { data, error } = await supabase
    .from("currents_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("period_ym", periodYm)
    .limit(1);

  if (error) {
    logSupabaseError("hasCurrentsForMonth", error);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export async function upsertCurrentsEntry(
  supabase: SupabaseClient,
  input: UpsertCurrentsEntryInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const payload = buildPayload(user.id, input);

  if (input.id) {
    const { data, error } = await supabase
      .from("currents_entries")
      .update(payload)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .select(SELECT)
      .single();

    if (error) {
      logSupabaseError("upsertCurrentsEntry update", error);
      return { data: null, error };
    }
    return { data: normalizeRow(data as Record<string, unknown>), error: null };
  }

  const { data, error } = await supabase
    .from("currents_entries")
    .insert({
      ...payload,
      recorded_at: new Date().toISOString(),
    })
    .select(SELECT)
    .single();

  if (error) {
    logSupabaseError("upsertCurrentsEntry insert", error);
    return { data: null, error };
  }

  return { data: normalizeRow(data as Record<string, unknown>), error: null };
}

export async function deleteCurrentsEntry(
  supabase: SupabaseClient,
  entryId: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { error: authError };
  }

  const { error } = await supabase
    .from("currents_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (error) {
    logSupabaseError("deleteCurrentsEntry", error);
  }

  return { error };
}