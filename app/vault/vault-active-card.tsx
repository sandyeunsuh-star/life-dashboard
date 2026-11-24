"use client";

import { ExternalLink, Gift, Pencil } from "lucide-react";
import { useEffect, useState } from "react";

import { SendToRewardsPopover } from "@/app/tidy-guild/send-to-rewards-popover";
import { suggestRewardPointsFromVaultPrice } from "@/lib/tidy/reward-bridge";

import { VaultThumbnail } from "@/app/vault/vault-thumbnail";
import {
  VaultTempCheckInBar,
  VaultTempTimeline,
  VaultTempTrendBadge,
} from "@/app/vault/vault-temperature-ui";
import { formatVaultCountdown, formatVaultPrice } from "@/lib/vault/format";
import type { VaultTempValue } from "@/lib/vault/temperature";
import type { VaultItem } from "@/lib/supabase/types/vault";

type VaultActiveCardProps = {
  item: VaultItem;
  onSkip: () => void;
  onBuy: () => void;
  onEdit: () => void;
  onTempCheckIn: (temp: VaultTempValue) => void;
  tempChecking?: boolean;
  skipping?: boolean;
  buying?: boolean;
  onSentToRewards?: (points: number) => void;
  sendingToRewards?: boolean;
};

export function VaultActiveCard({
  item,
  onSkip,
  onBuy,
  onEdit,
  onTempCheckIn,
  tempChecking,
  skipping,
  buying,
  onSentToRewards,
  sendingToRewards,
}: VaultActiveCardProps) {
  const [rewardOpen, setRewardOpen] = useState(false);
  const [countdown, setCountdown] = useState(() =>
    formatVaultCountdown(item.unlock_at),
  );
  const suggestedPts = suggestRewardPointsFromVaultPrice(
    item.price_amount,
    item.currency,
  );

  useEffect(() => {
    const tick = () => setCountdown(formatVaultCountdown(item.unlock_at));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [item.unlock_at]);

  return (
    <li className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <VaultThumbnail
            imageUrl={item.image_url}
            title={item.title}
            size="lg"
            onPlaceholderClick={onEdit}
          />
          <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
            <span className="text-sm font-medium tabular-nums text-zinc-700">
              {formatVaultPrice(item.price_amount, item.currency)}
            </span>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="Open product link"
              >
                <ExternalLink className="size-4" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100"
              aria-label="Edit"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-600">{countdown}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <VaultTempTrendBadge
              initialTemp={item.initial_temp}
              currentTemp={item.current_temp}
            />
            {item.urge_tag ? (
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                {item.urge_tag}
              </span>
            ) : null}
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium tabular-nums text-zinc-700">
              Skip → +{item.reward_points} pts
            </span>
          </div>
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Temperature check-in
            </p>
            <VaultTempCheckInBar
              currentTemp={item.current_temp}
              disabled={tempChecking}
              onCheckIn={onTempCheckIn}
            />
          </div>
          <VaultTempTimeline history={item.temp_history} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:w-44">
          {onSentToRewards ? (
            <div className="relative">
              <button
                type="button"
                disabled={sendingToRewards}
                onClick={() => setRewardOpen((o) => !o)}
                className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
              >
                <Gift className="size-4" aria-hidden />
                Send to Rewards
              </button>
              <SendToRewardsPopover
                open={rewardOpen}
                anchorLabel={`Send ${item.title} to Tidy Guild`}
                title={item.title}
                imageUrl={item.image_url}
                suggestedPoints={suggestedPts}
                loading={sendingToRewards}
                onClose={() => setRewardOpen(false)}
                onConfirm={(pts) => {
                  setRewardOpen(false);
                  onSentToRewards(pts);
                }}
              />
            </div>
          ) : null}
          <button
            type="button"
            disabled={skipping}
            onClick={onSkip}
            className="h-10 rounded-lg bg-zinc-900 text-sm font-medium text-white disabled:opacity-60"
          >
            {skipping ? "…" : `Skipped it! (+${item.reward_points} pts)`}
          </button>
          <button
            type="button"
            disabled={buying}
            onClick={onBuy}
            className="h-10 rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
          >
            {buying ? "…" : "Decided to buy"}
          </button>
        </div>
      </div>
    </li>
  );
}