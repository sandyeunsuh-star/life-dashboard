import type { TidyReward } from "@/lib/supabase/types/tidy";

export function isRewardUnredeemed(reward: TidyReward): boolean {
  return reward.is_repeatable || reward.redeemed_count === 0;
}

export function resolveActiveGoalReward(
  rewards: TidyReward[],
): TidyReward | null {
  const pinned = rewards.find((r) => r.is_goal && isRewardUnredeemed(r));
  if (pinned) {
    return pinned;
  }

  const candidates = rewards
    .filter(isRewardUnredeemed)
    .sort((a, b) => a.points_cost - b.points_cost);

  return candidates[0] ?? null;
}