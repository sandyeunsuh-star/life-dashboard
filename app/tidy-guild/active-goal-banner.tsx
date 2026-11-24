"use client";

import { createBrowserClientInstance } from "@/lib/supabase/client";
import { getTidyRewardPublicUrl } from "@/lib/supabase/storage/tidy-rewards";
import type { TidyReward } from "@/lib/supabase/types/tidy";

type ActiveGoalBannerProps = {
  reward: TidyReward;
  pointBalance: number;
  onRedeem: () => void;
  redeeming: boolean;
};

export function ActiveGoalBanner({
  reward,
  pointBalance,
  onRedeem,
  redeeming,
}: ActiveGoalBannerProps) {
  const canRedeem = pointBalance >= reward.points_cost;
  const progress = Math.min(100, (pointBalance / reward.points_cost) * 100);
  const imageUrl = reward.image_path
    ? getTidyRewardPublicUrl(createBrowserClientInstance(), reward.image_path)
  : null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
              decoding="async"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">
              No photo
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Active goal
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold text-zinc-900">
            {reward.title}
          </h2>
          <div className="mt-3">
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-zinc-700">
              <span className="font-semibold tabular-nums text-zinc-900">
                {pointBalance}
              </span>{" "}
              / {reward.points_cost} pts (
              <span className="tabular-nums">{Math.round(progress)}%</span>)
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!canRedeem || redeeming}
          onClick={onRedeem}
          className="h-11 shrink-0 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {redeeming ? "Redeeming…" : "Redeem"}
        </button>
      </div>
    </section>
  );
}