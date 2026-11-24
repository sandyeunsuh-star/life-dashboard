"use client";

import { Gift, X } from "lucide-react";
import { useState } from "react";

import { SendToRewardsPopover } from "@/app/tidy-guild/send-to-rewards-popover";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  createLinkedTidyReward,
  removeTidyRewardFromShop,
  type PatternRewardLink,
} from "@/lib/supabase/queries/tidy-reward-bridge";
import { revalidateTidyGuild } from "@/app/actions/revalidate-tidy-guild";

type PatternRewardBridgeProps = {
  patternId: string;
  title: string;
  imageUrl?: string | null;
  purchaseUrl?: string | null;
  source: "knitting" | "sewing";
  link: PatternRewardLink | null;
  onLinkChange: (patternId: string, link: PatternRewardLink | null) => void;
};

export function PatternRewardBridge({
  patternId,
  title,
  imageUrl,
  purchaseUrl,
  source,
  link,
  onLinkChange,
}: PatternRewardBridgeProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirmSend(points: number) {
    setBusy(true);
    const supabase = createBrowserClientInstance();
    const payload = {
      title,
      points_cost: points,
      image_url: imageUrl,
      source_url: purchaseUrl,
      link_url: purchaseUrl,
      ...(source === "knitting"
        ? { knitting_pattern_id: patternId }
        : { sewing_pattern_id: patternId }),
    };
    const { data, error } = await createLinkedTidyReward(supabase, payload);
    setBusy(false);
    if (error || !data) {
      console.error(formatSupabaseError(error));
      return;
    }
    onLinkChange(patternId, {
      rewardId: data.id,
      points_cost: data.points_cost,
    });
    setOpen(false);
    void revalidateTidyGuild();
  }

  async function removeFromShop(e: React.MouseEvent) {
    e.stopPropagation();
    if (!link) return;
    setBusy(true);
    const supabase = createBrowserClientInstance();
    const { error } = await removeTidyRewardFromShop(supabase, link.rewardId);
    setBusy(false);
    if (error) {
      console.error(formatSupabaseError(error));
      return;
    }
    onLinkChange(patternId, null);
    void revalidateTidyGuild();
  }

  if (link) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={removeFromShop}
        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-800 transition hover:border-zinc-300 disabled:opacity-50"
        title="Remove from Reward Shop (wishlist item stays)"
      >
        <span className="text-zinc-600">
          In Reward Shop · {link.points_cost} pts
        </span>
        <X className="size-3 text-zinc-500" aria-hidden />
      </button>
    );
  }

  return (
    <div
      className="relative"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-800 transition hover:bg-white"
      >
        <Gift className="size-3" aria-hidden />
        Send to Rewards
      </button>
      <SendToRewardsPopover
        open={open}
        anchorLabel={`Reward points for ${title}`}
        title={title}
        imageUrl={imageUrl}
        suggestedPoints={100}
        loading={busy}
        onClose={() => setOpen(false)}
        onConfirm={(pts) => void confirmSend(pts)}
      />
    </div>
  );
}