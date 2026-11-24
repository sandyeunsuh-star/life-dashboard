import type { SupabaseClient } from "@supabase/supabase-js";

import { logSupabaseError } from "./errors";
import type { TidyPointLogKind } from "./types/tidy";

export type InsertTidyPointLogInput = {
  user_id: string;
  points: number;
  kind: TidyPointLogKind;
  task_id?: string | null;
  reward_id?: string | null;
  step_id?: string | null;
  vault_item_id?: string | null;
  weekly_task_id?: string | null;
  habit_id?: string | null;
  gratitude_entry_id?: string | null;
  reason?: string | null;
  /** Override ledger timestamp (e.g. local noon on a past day). */
  created_at?: string;
};

/** Signed ledger row — `points` and `delta` always match. */
export function tidyPointLogPayload(input: InsertTidyPointLogInput) {
  const signed = Math.trunc(input.points);
  const row: Record<string, unknown> = {
    user_id: input.user_id,
    points: signed,
    delta: signed,
    kind: input.kind,
    task_id: input.task_id ?? null,
    reward_id: input.reward_id ?? null,
    step_id: input.step_id ?? null,
    vault_item_id: input.vault_item_id ?? null,
    weekly_task_id: input.weekly_task_id ?? null,
    habit_id: input.habit_id ?? null,
    gratitude_entry_id: input.gratitude_entry_id ?? null,
    reason: input.reason?.trim() || null,
  };
  if (input.created_at) {
    row.created_at = input.created_at;
  }
  return row;
}

export async function insertTidyPointLog(
  supabase: SupabaseClient,
  input: InsertTidyPointLogInput,
) {
  const payload = tidyPointLogPayload(input);
  const result = await supabase.from("tidy_point_logs").insert(payload);
  if (result.error) {
    logSupabaseError("insertTidyPointLog", result.error);
  }
  return result;
}

export function pointLogRowAmount(row: {
  delta?: number | null;
  points?: number | null;
}): number {
  const raw = row.delta ?? row.points ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}