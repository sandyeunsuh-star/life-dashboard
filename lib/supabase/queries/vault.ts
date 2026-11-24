import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { VaultCurrency, VaultUrgeTag } from "@/lib/vault/constants";
import { unlockAtFromHours } from "@/lib/vault/recommend";
import {
  VAULT_TEMP_DEFAULT,
  appendTempHistory,
  clampVaultTemp,
  firstTempHistoryEntry,
  parseTempHistory,
  type VaultTempValue,
} from "@/lib/vault/temperature";
import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import { insertTidyPointLog } from "../tidy-point-log";
import { sumTidyPointBalance } from "./tidy";
import type { VaultItem, VaultSnapshot } from "../types/vault";

const VAULT_SELECT =
  "id, user_id, title, price_amount, currency, pause_hours, reward_points, unlock_at, urge_tag, url, image_url, notes, initial_temp, current_temp, temp_history, status, linked_reward_id, resolved_at, created_at, updated_at";

export function normalizeVaultItem(row: VaultItem): VaultItem {
  const initial = clampVaultTemp(row.initial_temp ?? VAULT_TEMP_DEFAULT);
  const current = clampVaultTemp(row.current_temp ?? initial);
  const history = parseTempHistory(row.temp_history);
  return {
    ...row,
    price_amount: Number(row.price_amount),
    urge_tag: (row.urge_tag as VaultUrgeTag | null) ?? null,
    url: row.url?.trim() || null,
    image_url: row.image_url?.trim() || null,
    linked_reward_id: row.linked_reward_id ?? null,
    notes: row.notes?.trim() || null,
    initial_temp: initial,
    current_temp: current,
    temp_history: history,
  };
}

function computeSnapshotStats(items: VaultItem[]): Omit<VaultSnapshot, "items"> {
  let keptSafeKrw = 0;
  let keptSafeUsd = 0;
  let pausedCount = 0;
  let pendingRewardPoints = 0;

  for (const item of items) {
    if (item.status === "skipped") {
      if (item.currency === "KRW") {
        keptSafeKrw += item.price_amount;
      } else {
        keptSafeUsd += item.price_amount;
      }
    } else if (item.status === "paused") {
      pausedCount += 1;
      pendingRewardPoints += item.reward_points;
    }
  }

  return { keptSafeKrw, keptSafeUsd, pausedCount, pendingRewardPoints };
}

export async function fetchVaultSnapshot(
  supabase: SupabaseClient,
): Promise<{ data: VaultSnapshot | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      data: null,
      error: authError
        ? ({ message: authError.message, code: authError.name } as PostgrestError)
        : null,
    };
  }

  const { data, error } = await supabase
    .from("vault_items")
    .select(VAULT_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<VaultItem[]>();

  if (error) {
    logSupabaseError("fetchVaultSnapshot", error);
    return { data: null, error };
  }

  const items = (data ?? []).map(normalizeVaultItem);
  return {
    data: {
      items,
      ...computeSnapshotStats(items),
    },
    error: null,
  };
}

export async function listPausedVaultItems(
  supabase: SupabaseClient,
  limit = 3,
): Promise<{ data: VaultItem[]; error: PostgrestError | null }> {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      data: [],
      error: authError
        ? ({ message: authError.message, code: authError.name } as PostgrestError)
        : null,
    };
  }

  const { data, error } = await supabase
    .from("vault_items")
    .select(VAULT_SELECT)
    .eq("user_id", user.id)
    .eq("status", "paused")
    .order("unlock_at", { ascending: true })
    .limit(limit)
    .returns<VaultItem[]>();

  if (error) {
    logSupabaseError("listPausedVaultItems", error);
    return { data: [], error };
  }

  return { data: (data ?? []).map(normalizeVaultItem), error: null };
}

export async function countPausedVaultItems(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      count: 0,
      error: authError
        ? ({ message: authError.message, code: authError.name } as PostgrestError)
        : null,
    };
  }

  const { count, error } = await supabase
    .from("vault_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "paused");

  if (error) {
    logSupabaseError("countPausedVaultItems", error);
    return { count: 0, error };
  }

  return { count: count ?? 0, error: null };
}

export type UpsertVaultItemInput = {
  id?: string;
  title: string;
  price_amount: number;
  currency: VaultCurrency;
  pause_hours: number;
  reward_points: number;
  urge_tag?: VaultUrgeTag | null;
  url?: string | null;
  image_url?: string | null;
  notes?: string | null;
  initial_temp?: VaultTempValue;
};

export async function upsertVaultItem(
  supabase: SupabaseClient,
  input: UpsertVaultItemInput,
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
        message: "Item name is required",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const price = Number(input.price_amount);
  if (!Number.isFinite(price) || price <= 0) {
    return {
      data: null,
      error: {
        message: "Enter a valid price",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const pauseHours = Math.max(1, Math.floor(input.pause_hours));
  const rewardPoints = Math.max(1, Math.floor(input.reward_points));
  const unlockAt = unlockAtFromHours(pauseHours).toISOString();
  const now = new Date().toISOString();

  if (input.id) {
    const payload = {
      title,
      price_amount: price,
      currency: input.currency,
      pause_hours: pauseHours,
      reward_points: rewardPoints,
      unlock_at: unlockAt,
      urge_tag: input.urge_tag ?? null,
      url: input.url?.trim() || null,
      image_url: input.image_url?.trim() || null,
      notes: input.notes?.trim() || null,
      updated_at: now,
    };

    const result = await supabase
      .from("vault_items")
      .update(payload)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .eq("status", "paused")
      .select(VAULT_SELECT)
      .single()
      .returns<VaultItem>();

    if (result.error) logSupabaseError("upsertVaultItem update", result.error);
    return result.data
      ? { ...result, data: normalizeVaultItem(result.data) }
      : result;
  }

  const initialTemp = clampVaultTemp(input.initial_temp ?? VAULT_TEMP_DEFAULT);
  const history = firstTempHistoryEntry(initialTemp, now);

  const payload = {
    title,
    price_amount: price,
    currency: input.currency,
    pause_hours: pauseHours,
    reward_points: rewardPoints,
    unlock_at: unlockAt,
    urge_tag: input.urge_tag ?? null,
    url: input.url?.trim() || null,
    image_url: input.image_url?.trim() || null,
    notes: input.notes?.trim() || null,
    initial_temp: initialTemp,
    current_temp: initialTemp,
    temp_history: history,
    status: "paused" as const,
    resolved_at: null,
    updated_at: now,
  };

  const result = await supabase
    .from("vault_items")
    .insert({ ...payload, user_id: user.id })
    .select(VAULT_SELECT)
    .single()
    .returns<VaultItem>();

  if (result.error) logSupabaseError("upsertVaultItem insert", result.error);
  return result.data
    ? { ...result, data: normalizeVaultItem(result.data) }
    : result;
}

export async function skipVaultItem(
  supabase: SupabaseClient,
  item: VaultItem,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, balance: 0, error: authError };
  }

  if (item.status !== "paused") {
    return {
      data: null,
      balance: await sumTidyPointBalance(supabase, user.id),
      error: {
        message: "Item is not active",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const resolvedAt = new Date().toISOString();
  const reason = `Vault Win: Skipped ${item.title}`;

  const updateRes = await supabase
    .from("vault_items")
    .update({
      status: "skipped",
      resolved_at: resolvedAt,
      updated_at: resolvedAt,
    })
    .eq("id", item.id)
    .eq("user_id", user.id)
    .select(VAULT_SELECT)
    .single()
    .returns<VaultItem>();

  if (updateRes.error || !updateRes.data) {
    logSupabaseError("skipVaultItem update", updateRes.error);
    return { data: null, balance: 0, error: updateRes.error };
  }

  const logRes = await insertTidyPointLog(supabase, {
    user_id: user.id,
    points: item.reward_points,
    kind: "vault_skip",
    vault_item_id: item.id,
    reason,
  });

  if (logRes.error) {
    logSupabaseError("skipVaultItem log", logRes.error);
    return { data: null, balance: 0, error: logRes.error };
  }

  const balance = await sumTidyPointBalance(supabase, user.id);
  return {
    data: normalizeVaultItem(updateRes.data),
    balance,
    error: null,
  };
}

export async function buyVaultItem(
  supabase: SupabaseClient,
  item: VaultItem,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  if (item.status !== "paused") {
    return {
      data: null,
      error: {
        message: "Item is not active",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const resolvedAt = new Date().toISOString();
  const result = await supabase
    .from("vault_items")
    .update({
      status: "bought",
      resolved_at: resolvedAt,
      updated_at: resolvedAt,
    })
    .eq("id", item.id)
    .eq("user_id", user.id)
    .select(VAULT_SELECT)
    .single()
    .returns<VaultItem>();

  if (result.error) logSupabaseError("buyVaultItem", result.error);
  return result.data
    ? { ...result, data: normalizeVaultItem(result.data) }
    : result;
}

export async function reparkVaultItem(
  supabase: SupabaseClient,
  item: VaultItem,
) {
  if (item.status !== "skipped") {
    return {
      data: null,
      error: {
        message: "Only skipped items can be re-parked",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  return upsertVaultItem(supabase, {
    title: item.title,
    price_amount: item.price_amount,
    currency: item.currency,
    pause_hours: item.pause_hours,
    reward_points: item.reward_points,
    urge_tag: item.urge_tag,
    url: item.url,
    image_url: item.image_url,
    notes: item.notes,
    initial_temp: item.current_temp,
  });
}

export async function checkInVaultTemperature(
  supabase: SupabaseClient,
  item: VaultItem,
  temp: VaultTempValue,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  if (item.status !== "paused") {
    return {
      data: null,
      error: {
        message: "Item is not active",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const nextTemp = clampVaultTemp(temp);
  const checkedAt = new Date().toISOString();
  const nextHistory = appendTempHistory(item.temp_history, nextTemp, checkedAt);

  const result = await supabase
    .from("vault_items")
    .update({
      current_temp: nextTemp,
      temp_history: nextHistory,
      updated_at: checkedAt,
    })
    .eq("id", item.id)
    .eq("user_id", user.id)
    .eq("status", "paused")
    .select(VAULT_SELECT)
    .single()
    .returns<VaultItem>();

  if (result.error) logSupabaseError("checkInVaultTemperature", result.error);
  return result.data
    ? { ...result, data: normalizeVaultItem(result.data) }
    : result;
}