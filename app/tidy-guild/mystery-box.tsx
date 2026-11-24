"use client";

import { useEffect, useState } from "react";

import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { openTidyMysteryTreat } from "@/lib/supabase/queries/tidy";
import { getTidyRewardPublicUrl } from "@/lib/supabase/storage/tidy-rewards";
import type { TidyReward } from "@/lib/supabase/types/tidy";
import {
  readMysterySpinCost,
  writeMysterySpinCost,
} from "@/lib/ui/tidy-mystery";
import { formInputMdClass } from "@/lib/ui/form-styles";

type MysteryBoxProps = {
  rewards: TidyReward[];
  pointBalance: number;
  onBalanceChange: (balance: number) => void;
  onRewardUpdated: (reward: TidyReward) => void;
  onReveal: (title: string) => void;
};

export function MysteryBox({
  rewards,
  pointBalance,
  onBalanceChange,
  onRewardUpdated,
  onReveal,
}: MysteryBoxProps) {
  const [spinCost, setSpinCost] = useState(30);
  const [editingCost, setEditingCost] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [revealTitle, setRevealTitle] = useState<string | null>(null);
  const [revealImage, setRevealImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mysteryCount = rewards.filter((r) => r.is_mystery).length;

  useEffect(() => {
    setSpinCost(readMysterySpinCost());
  }, []);

  async function handleOpen() {
    setError(null);
    setSpinning(true);
    setRevealTitle(null);
    setRevealImage(null);

    const supabase = createBrowserClientInstance();
    const mystery = rewards.filter((r) => r.is_mystery);

    await new Promise((r) => setTimeout(r, 1500));

    const { data, balance, error: spinError } = await openTidyMysteryTreat(
      supabase,
      spinCost,
      mystery,
    );

    setSpinning(false);

    if (spinError) {
      setError(formatSupabaseError(spinError));
      return;
    }

    if (!data?.reward) {
      return;
    }

    onBalanceChange(balance);
    onRewardUpdated(data.reward);
    onReveal(data.reward.title);

    setRevealTitle(data.reward.title);
    if (data.reward.image_path) {
      setRevealImage(
        getTidyRewardPublicUrl(supabase, data.reward.image_path),
      );
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900">🎁 Mystery Treat</p>
          <p className="mt-0.5 text-xs text-zinc-600">
            Spin for a surprise reward ({mysteryCount} in pool)
          </p>
        </div>
        {editingCost ? (
          <input
            type="number"
            min={1}
            value={spinCost}
            onChange={(e) => {
              const n = Math.max(1, Number.parseInt(e.target.value, 10) || 30);
              setSpinCost(n);
              writeMysterySpinCost(n);
            }}
            onBlur={() => setEditingCost(false)}
            className={`${formInputMdClass} w-16 text-center text-xs`}
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingCost(true)}
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-900"
          >
            {spinCost} pts
          </button>
        )}
      </div>

      <div className="relative mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
        <div
          className={`flex min-h-[4.5rem] items-center justify-center px-3 py-4 transition ${
            spinning ? "animate-pulse" : ""
          }`}
        >
          {spinning ? (
            <p className="text-sm font-medium text-zinc-700">Spinning…</p>
          ) : revealTitle ? (
            <div className="flex flex-col items-center gap-2 text-center">
              {revealImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={revealImage}
                  alt=""
                  className="size-16 rounded-lg object-cover shadow"
                />
              ) : null}
              <p className="text-sm font-semibold text-zinc-900">{revealTitle}</p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Your treat appears here</p>
          )}
        </div>
      </div>

      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}

      <button
        type="button"
        disabled={spinning || pointBalance < spinCost || mysteryCount < 2}
        onClick={() => void handleOpen()}
        className="mt-3 h-10 w-full rounded-lg bg-zinc-900 text-sm font-medium text-white disabled:opacity-40"
      >
        Open Mystery Treat
      </button>
      {mysteryCount < 2 ? (
        <p className="mt-2 text-[10px] text-zinc-500">
          Tag 2+ rewards as &quot;Include in Mystery Box&quot; in the reward editor.
        </p>
      ) : null}
    </div>
  );
}