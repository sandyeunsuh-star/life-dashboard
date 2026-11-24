"use client";

import { useEffect, useState } from "react";

import { BackdateDateControl } from "@/app/tidy-guild/backdate-date-control";
import { TIDY_WIN_LOG_PRESETS } from "@/lib/tidy/constants";
import {
  createdAtLocalNoonIso,
  todayLocalDateIso,
} from "@/lib/tidy/backdate-dates";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { logTidyQuickWin } from "@/lib/supabase/queries/tidy";
import type { TidyTask } from "@/lib/supabase/types/tidy";
import { formInputMdClass } from "@/lib/ui/form-styles";

type LogWinBarProps = {
  todayDateIso: string;
  logDateYmd: string;
  onLogDateChange: (next: string) => void;
  onEarned: (payload: {
    points: number;
    balance: number;
    task: TidyTask | null;
    taskId?: string;
    dateYmd: string;
  }) => void;
};

export function LogWinBar({
  todayDateIso,
  logDateYmd,
  onLogDateChange,
  onEarned,
}: LogWinBarProps) {
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState<number>(15);
  const [customPoints, setCustomPoints] = useState("");
  const [keepInMenu, setKeepInMenu] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxDate = todayDateIso || todayLocalDateIso();

  useEffect(() => {
    if (logDateYmd > maxDate) onLogDateChange(maxDate);
  }, [logDateYmd, maxDate, onLogDateChange]);

  async function handleEarn() {
    setError(null);
    const resolvedPoints =
      customPoints.trim() !== ""
        ? Math.max(1, parseInt(customPoints, 10) || points)
        : points;

    setLoading(true);
    const supabase = createBrowserClientInstance();
    const created_at = createdAtLocalNoonIso(logDateYmd);
    const { data, balance, newTask, error: winError } = await logTidyQuickWin(
      supabase,
      {
        title,
        points: resolvedPoints,
        keepInAnytimeMenu: keepInMenu,
        created_at,
      },
    );
    setLoading(false);

    if (winError) {
      setError(formatSupabaseError(winError));
      return;
    }

    const earned = data?.points ?? resolvedPoints;
    onEarned({
      points: earned,
      balance,
      task: newTask,
      taskId:
        newTask?.id ??
        (typeof data === "object" && data && "taskId" in data
          ? String(data.taskId)
          : undefined),
      dateYmd: logDateYmd,
    });
    setTitle("");
    setCustomPoints("");
  }

  return (
    <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        Log a win
      </p>
      <div className="mb-2">
        <BackdateDateControl
          value={logDateYmd}
          onChange={onLogDateChange}
          maxDate={maxDate}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Did something on a whim? Log it…"
          className={`min-w-0 flex-1 ${formInputMdClass}`}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleEarn();
            }
          }}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {TIDY_WIN_LOG_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setPoints(preset);
                setCustomPoints("");
              }}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition ${
                customPoints === "" && points === preset
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-zinc-50 text-zinc-900 hover:bg-white"
              }`}
            >
              +{preset}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={loading || !title.trim()}
          onClick={() => void handleEarn()}
          className="h-10 shrink-0 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? "…" : "Earn"}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-zinc-700">
          <input
            type="checkbox"
            checked={keepInMenu}
            onChange={(e) => setKeepInMenu(e.target.checked)}
            className="size-3.5 rounded border-zinc-400"
          />
          Keep in Anytime menu
        </label>
        {error ? (
          <p className="text-xs text-red-700">{error}</p>
        ) : null}
      </div>
    </div>
  );
}