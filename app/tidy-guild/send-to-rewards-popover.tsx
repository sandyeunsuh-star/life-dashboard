"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { REWARD_POINT_PILLS } from "@/lib/tidy/reward-bridge";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

type SendToRewardsPopoverProps = {
  open: boolean;
  anchorLabel: string;
  title: string;
  imageUrl?: string | null;
  suggestedPoints: number;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (points: number) => void;
};

export function SendToRewardsPopover({
  open,
  anchorLabel,
  title,
  imageUrl,
  suggestedPoints,
  loading,
  onClose,
  onConfirm,
}: SendToRewardsPopoverProps) {
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState(suggestedPoints);

  useEffect(() => {
    if (open) setPoints(suggestedPoints);
  }, [open, suggestedPoints]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const thumb = imageUrl?.trim();

  return (
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      aria-label={anchorLabel}
      className="absolute left-0 top-full z-20 mt-2 w-[min(100%,18rem)] rounded-xl border border-zinc-200 bg-white p-3 shadow-lg"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Send to Reward Shop
      </p>
      <div className="mt-2 flex gap-2.5">
        {thumb ? (
          <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            <Image
              src={thumb}
              alt=""
              width={48}
              height={48}
              unoptimized
              loading="lazy"
              className="size-full object-contain"
            />
          </div>
        ) : null}
        <p className="min-w-0 flex-1 text-sm font-medium text-zinc-900">
          {title}
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <span className={formLabelClass}>Point cost</span>
        <div className="flex flex-wrap gap-1.5">
          {REWARD_POINT_PILLS.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => setPoints(pill)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition ${
                points === pill
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-white"
              }`}
            >
              {pill} pts
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          value={points}
          onChange={(e) =>
            setPoints(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
          }
          className={`${formInputMdClass} tabular-nums`}
        />
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-800"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => onConfirm(points)}
          className="h-9 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white disabled:opacity-50"
        >
          {loading ? "…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}