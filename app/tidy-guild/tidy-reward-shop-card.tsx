"use client";

import Image from "next/image";
import { Star } from "lucide-react";

import { isRewardUnredeemed } from "@/lib/tidy/active-goal";
import {
  rewardIsLinkedToSource,
  tidyRewardSourceKind,
  tidyRewardSourceLabel,
} from "@/lib/tidy/reward-bridge";
import { TIDY_REWARD_TIERS } from "@/lib/tidy/constants";
import type { TidyReward } from "@/lib/supabase/types/tidy";
import { getTidyRewardPublicUrl } from "@/lib/supabase/storage/tidy-rewards";
import type { SupabaseClient } from "@supabase/supabase-js";

function tierLabel(tier: TidyReward["tier"]): string {
  return TIDY_REWARD_TIERS.find((t) => t.value === tier)?.label ?? tier;
}

function rewardThumbnail(
  supabase: SupabaseClient,
  reward: TidyReward,
): string | null {
  if (reward.image_url?.trim()) return reward.image_url.trim();
  if (reward.image_path) {
    return getTidyRewardPublicUrl(supabase, reward.image_path);
  }
  return null;
}

type TidyRewardShopCardProps = {
  reward: TidyReward;
  supabase: SupabaseClient;
  pointBalance: number;
  onPinGoal: () => void;
  onRedeem: () => void;
  onEdit: () => void;
  onRemove: () => void;
  removing?: boolean;
  redeemDisabled?: boolean;
};

export function TidyRewardShopCard({
  reward,
  supabase,
  pointBalance,
  onPinGoal,
  onRedeem,
  onEdit,
  onRemove,
  removing,
  redeemDisabled,
}: TidyRewardShopCardProps) {
  const linked = rewardIsLinkedToSource(reward);
  const sourceKind = tidyRewardSourceKind(reward);
  const sourceLabel = tidyRewardSourceLabel(sourceKind);
  const thumb = rewardThumbnail(supabase, reward);
  const canRedeem =
    pointBalance >= reward.points_cost && isRewardUnredeemed(reward);

  return (
    <li className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex gap-3 p-3">
        <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 p-1">
          {thumb ? (
            <Image
              src={thumb}
              alt=""
              width={48}
              height={48}
              unoptimized
              loading="lazy"
              className="size-full object-contain"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-zinc-100 text-[10px] text-zinc-400">
              —
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <RewardTitleBlock reward={reward} tierLabel={tierLabel(reward.tier)} />
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-900">
              {reward.points_cost} pts
            </span>
          </div>
          {sourceLabel ? (
            <span className="mt-1 inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
              {sourceLabel}
            </span>
          ) : null}
          {reward.link_url ? (
            <a
              href={reward.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-xs font-medium text-zinc-600 underline"
            >
              View link
            </a>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onPinGoal}
          className={`shrink-0 self-start rounded-lg border bg-white p-1.5 shadow-sm ${
            reward.is_goal
              ? "border-amber-400 text-amber-600"
              : "border-zinc-200 text-zinc-500"
          }`}
          aria-label="Pin as active goal"
        >
          <Star
            className="size-4"
            fill={reward.is_goal ? "currentColor" : "none"}
          />
        </button>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-zinc-100 px-3 py-2.5">
        <button
          type="button"
          disabled={!canRedeem || redeemDisabled}
          onClick={onRedeem}
          className="h-9 min-w-0 flex-1 rounded-lg bg-zinc-900 text-sm font-medium text-white disabled:opacity-40"
        >
          Redeem
        </button>
        {!linked ? (
          <button
            type="button"
            onClick={onEdit}
            className="h-9 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900"
          >
            Edit
          </button>
        ) : null}
        <button
          type="button"
          disabled={removing}
          onClick={onRemove}
          className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          {removing ? "…" : linked ? "Remove from Shop" : "Remove"}
        </button>
      </div>
    </li>
  );
}

function RewardTitleBlock({
  reward,
  tierLabel: tier,
}: {
  reward: TidyReward;
  tierLabel: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-zinc-900">{reward.title}</p>
      <span className="mt-0.5 inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
        {tier}
      </span>
    </div>
  );
}