import type { VaultItem, VaultSnapshot } from "@/lib/supabase/types/vault";

export function computeVaultStatsFromItems(
  items: VaultItem[],
): Pick<
  VaultSnapshot,
  "keptSafeKrw" | "keptSafeUsd" | "pausedCount" | "pendingRewardPoints"
> {
  let keptSafeKrw = 0;
  let keptSafeUsd = 0;
  let pausedCount = 0;
  let pendingRewardPoints = 0;

  for (const item of items) {
    if (item.status === "skipped") {
      if (item.currency === "KRW") keptSafeKrw += item.price_amount;
      else keptSafeUsd += item.price_amount;
    } else if (item.status === "paused") {
      pausedCount += 1;
      pendingRewardPoints += item.reward_points;
    }
  }

  return { keptSafeKrw, keptSafeUsd, pausedCount, pendingRewardPoints };
}