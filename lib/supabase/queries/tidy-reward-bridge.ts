import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { tidyRewardTierForPoints } from "@/lib/tidy/reward-bridge";
import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import type { TidyReward } from "../types/tidy";
import type { VaultItem } from "../types/vault";
import { normalizeVaultItem } from "./vault";

const LINKED_REWARD_SELECT =
  "id, user_id, title, points_cost, image_path, image_url, link_url, source_url, is_goal, is_repeatable, redeemed_count, tier, is_mystery, vault_item_id, knitting_pattern_id, sewing_pattern_id, created_at, updated_at";

export type PatternRewardLink = {
  rewardId: string;
  points_cost: number;
};

export type CreateLinkedTidyRewardInput = {
  title: string;
  points_cost: number;
  image_url?: string | null;
  source_url?: string | null;
  link_url?: string | null;
  vault_item_id?: string;
  knitting_pattern_id?: string;
  sewing_pattern_id?: string;
};

function normalizeLinkedReward(row: TidyReward): TidyReward {
  return {
    ...row,
    image_url: row.image_url?.trim() || null,
    source_url: row.source_url?.trim() || null,
    vault_item_id: row.vault_item_id ?? null,
    knitting_pattern_id: row.knitting_pattern_id ?? null,
    sewing_pattern_id: row.sewing_pattern_id ?? null,
  };
}

async function findExistingLinkedReward(
  supabase: SupabaseClient,
  userId: string,
  filter: {
    vault_item_id?: string;
    knitting_pattern_id?: string;
    sewing_pattern_id?: string;
  },
) {
  let q = supabase
    .from("tidy_rewards")
    .select("id")
    .eq("user_id", userId);

  if (filter.vault_item_id) {
    q = q.eq("vault_item_id", filter.vault_item_id);
  } else if (filter.knitting_pattern_id) {
    q = q.eq("knitting_pattern_id", filter.knitting_pattern_id);
  } else if (filter.sewing_pattern_id) {
    q = q.eq("sewing_pattern_id", filter.sewing_pattern_id);
  } else {
    return null;
  }

  const { data, error } = await q.maybeSingle();
  if (error) logSupabaseError("findExistingLinkedReward", error);
  return data?.id ?? null;
}

export async function createLinkedTidyReward(
  supabase: SupabaseClient,
  input: CreateLinkedTidyRewardInput,
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

  const title = input.title.trim();
  if (!title) {
    return {
      data: null,
      error: {
        message: "Title is required",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const points = Math.max(1, Math.floor(input.points_cost));
  const existingId = await findExistingLinkedReward(supabase, user.id, {
    vault_item_id: input.vault_item_id,
    knitting_pattern_id: input.knitting_pattern_id,
    sewing_pattern_id: input.sewing_pattern_id,
  });
  if (existingId) {
    return {
      data: null,
      error: {
        message: "Already in the Reward Shop",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const payload = {
    user_id: user.id,
    title,
    points_cost: points,
    tier: tidyRewardTierForPoints(points),
    image_url: input.image_url?.trim() || null,
    source_url: input.source_url?.trim() || null,
    link_url:
      input.link_url?.trim() || input.source_url?.trim() || null,
    image_path: null,
    is_goal: false,
    is_repeatable: false,
    is_mystery: false,
    vault_item_id: input.vault_item_id ?? null,
    knitting_pattern_id: input.knitting_pattern_id ?? null,
    sewing_pattern_id: input.sewing_pattern_id ?? null,
    updated_at: new Date().toISOString(),
  };

  const result = await supabase
    .from("tidy_rewards")
    .insert(payload)
    .select(LINKED_REWARD_SELECT)
    .single()
    .returns<TidyReward>();

  if (result.error || !result.data) {
    logSupabaseError("createLinkedTidyReward", result.error);
    return { data: null, error: result.error };
  }

  return {
    data: normalizeLinkedReward(result.data),
    error: null as PostgrestError | null,
  };
}

export async function sendVaultItemToTidyRewards(
  supabase: SupabaseClient,
  item: VaultItem,
  pointsCost: number,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      data: null,
      vaultItem: null,
      error: authError
        ? ({ message: authError.message, code: authError.name } as PostgrestError)
        : null,
    };
  }

  if (item.status !== "paused") {
    return {
      data: null,
      vaultItem: null,
      error: {
        message: "Only cooling-off items can move to rewards",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const created = await createLinkedTidyReward(supabase, {
    title: item.title,
    points_cost: pointsCost,
    image_url: item.image_url,
    source_url: item.url,
    link_url: item.url,
    vault_item_id: item.id,
  });
  if (created.error || !created.data) {
    return { data: null, vaultItem: null, error: created.error };
  }

  const now = new Date().toISOString();
  const vaultRes = await supabase
    .from("vault_items")
    .update({
      status: "rewarded",
      linked_reward_id: created.data.id,
      resolved_at: now,
      updated_at: now,
    })
    .eq("id", item.id)
    .eq("user_id", user.id)
    .select(
    "id, user_id, title, price_amount, currency, pause_hours, reward_points, unlock_at, urge_tag, url, image_url, notes, initial_temp, current_temp, temp_history, status, resolved_at, linked_reward_id, created_at, updated_at",
  )
    .single()
    .returns<VaultItem>();

  if (vaultRes.error || !vaultRes.data) {
    logSupabaseError("sendVaultItemToTidyRewards vault", vaultRes.error);
    await supabase
      .from("tidy_rewards")
      .delete()
      .eq("id", created.data.id)
      .eq("user_id", user.id);
    return { data: null, vaultItem: null, error: vaultRes.error };
  }

  return {
    data: created.data,
    vaultItem: normalizeVaultItem(vaultRes.data),
    error: null as PostgrestError | null,
  };
}

export async function fetchPatternRewardLinks(
  supabase: SupabaseClient,
  knittingIds: string[],
  sewingIds: string[],
): Promise<{
  knitting: Record<string, PatternRewardLink>;
  sewing: Record<string, PatternRewardLink>;
}> {
  const knitting: Record<string, PatternRewardLink> = {};
  const sewing: Record<string, PatternRewardLink> = {};

  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { knitting, sewing };
  }

  if (knittingIds.length > 0) {
    const { data, error } = await supabase
      .from("tidy_rewards")
      .select("id, knitting_pattern_id, points_cost")
      .eq("user_id", user.id)
      .in("knitting_pattern_id", knittingIds);
    if (error) logSupabaseError("fetchPatternRewardLinks knitting", error);
    for (const row of data ?? []) {
      const pid = row.knitting_pattern_id as string | null;
      if (pid) {
        knitting[pid] = {
          rewardId: row.id as string,
          points_cost: row.points_cost as number,
        };
      }
    }
  }

  if (sewingIds.length > 0) {
    const { data, error } = await supabase
      .from("tidy_rewards")
      .select("id, sewing_pattern_id, points_cost")
      .eq("user_id", user.id)
      .in("sewing_pattern_id", sewingIds);
    if (error) logSupabaseError("fetchPatternRewardLinks sewing", error);
    for (const row of data ?? []) {
      const pid = row.sewing_pattern_id as string | null;
      if (pid) {
        sewing[pid] = {
          rewardId: row.id as string,
          points_cost: row.points_cost as number,
        };
      }
    }
  }

  return { knitting, sewing };
}

/** Deletes only `tidy_rewards` and clears vault links — never touches source records. */
export async function removeTidyRewardFromShop(
  supabase: SupabaseClient,
  rewardId: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return {
      error: authError
        ? ({ message: authError.message, code: authError.name } as PostgrestError)
        : null,
    };
  }

  const { data: reward, error: fetchError } = await supabase
    .from("tidy_rewards")
    .select("id, vault_item_id")
    .eq("id", rewardId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    logSupabaseError("removeTidyRewardFromShop fetch", fetchError);
    return { error: fetchError };
  }
  if (!reward) {
    return {
      error: {
        message: "Reward not found",
        code: "not_found",
      } as PostgrestError,
    };
  }

  if (reward.vault_item_id) {
    const vaultPatch = await supabase
      .from("vault_items")
      .update({
        linked_reward_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reward.vault_item_id)
      .eq("user_id", user.id);
    if (vaultPatch.error) {
      logSupabaseError("removeTidyRewardFromShop vault", vaultPatch.error);
    }
  }

  const del = await supabase
    .from("tidy_rewards")
    .delete()
    .eq("id", rewardId)
    .eq("user_id", user.id);

  if (del.error) logSupabaseError("removeTidyRewardFromShop", del.error);
  return { error: del.error };
}