import type { VaultCurrency } from "@/lib/vault/constants";
import type { TidyRewardTier } from "@/lib/tidy/constants";

export const REWARD_POINT_PILLS = [100, 250, 500] as const;

export function suggestRewardPointsFromVaultPrice(
  amount: number,
  currency: VaultCurrency,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 100;
  if (currency === "USD") {
    if (amount < 30) return 100;
    if (amount <= 100) return 250;
    return 500;
  }
  if (amount < 40_000) return 100;
  if (amount <= 140_000) return 250;
  return 500;
}

export function tidyRewardTierForPoints(points: number): TidyRewardTier {
  const pts = Math.max(1, Math.floor(points));
  if (pts <= 100) return "micro";
  if (pts <= 250) return "medium";
  return "grail";
}

export type TidyRewardSourceKind = "vault" | "knitting" | "sewing" | "manual";

export function tidyRewardSourceKind(reward: {
  vault_item_id?: string | null;
  knitting_pattern_id?: string | null;
  sewing_pattern_id?: string | null;
}): TidyRewardSourceKind {
  if (reward.vault_item_id) return "vault";
  if (reward.knitting_pattern_id) return "knitting";
  if (reward.sewing_pattern_id) return "sewing";
  return "manual";
}

export function tidyRewardSourceLabel(kind: TidyRewardSourceKind): string {
  switch (kind) {
    case "vault":
      return "From Vault";
    case "knitting":
      return "Knitting Wishlist";
    case "sewing":
      return "Sewing Wishlist";
    default:
      return "";
  }
}

export function rewardIsLinkedToSource(reward: {
  vault_item_id?: string | null;
  knitting_pattern_id?: string | null;
  sewing_pattern_id?: string | null;
}): boolean {
  return tidyRewardSourceKind(reward) !== "manual";
}