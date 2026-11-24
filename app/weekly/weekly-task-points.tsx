"use client";

import { useState } from "react";

import {
  WEEKLY_TIDY_POINT_PRESETS,
} from "@/lib/weekly/constants";
import { weeklyTaskPoints } from "@/lib/weekly/task-points";
import { formInputMdClass } from "@/lib/ui/form-styles";

export function WeeklyTaskPointsBadge({ points }: { points: number }) {
  if (points <= 0) return null;
  return (
    <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-700">
      +{points} pts
    </span>
  );
}

export function WeeklyAnytimeClaimBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-900">
      ×{count}
    </span>
  );
}

type WeeklyTaskPointsPickerProps = {
  value: number;
  onChange: (points: number) => void;
};

export function WeeklyTaskPointsPicker({
  value,
  onChange,
}: WeeklyTaskPointsPickerProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const activePreset =
    WEEKLY_TIDY_POINT_PRESETS.includes(
      value as (typeof WEEKLY_TIDY_POINT_PRESETS)[number],
    )
      ? value
      : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-900 group-hover:opacity-100"
        aria-label="Tidy Guild points"
      >
        {value > 0 ? `+${value}` : "Pts"}
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-6 z-50 w-44 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Tidy Guild
            </p>
            <div className="flex flex-wrap gap-1">
              {WEEKLY_TIDY_POINT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    onChange(preset);
                    setCustom("");
                    setOpen(false);
                  }}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    (activePreset === preset && custom === "") ||
                    (preset === 0 && value === 0)
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                  }`}
                >
                  {preset === 0 ? "None" : `+${preset}`}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={0}
              placeholder="Custom"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                const n = Number.parseInt(e.target.value, 10);
                if (Number.isFinite(n) && n >= 0) onChange(n);
              }}
              className={`mt-2 h-8 ${formInputMdClass}`}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

export { weeklyTaskPoints };