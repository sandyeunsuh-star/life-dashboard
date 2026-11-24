"use client";

import { Pencil } from "lucide-react";
import { useCallback, useState } from "react";

import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { upsertTidyGoals } from "@/lib/supabase/queries/tidy-goals";
import type { TidyGoalProgress } from "@/lib/supabase/types/tidy-goals";

function ProgressBar({
  label,
  earned,
  goal,
  editing,
  editValue,
  onStartEdit,
  onEditChange,
  onCommit,
  onCancel,
}: {
  label: string;
  earned: number;
  goal: number;
  editing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const pct = goal > 0 ? Math.min(100, (earned / goal) * 100) : 0;

  return (
    <div className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </span>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommit();
                if (e.key === "Escape") onCancel();
              }}
              className="h-7 w-16 rounded-md border border-zinc-200 px-1.5 text-xs tabular-nums"
              autoFocus
            />
            <button
              type="button"
              onClick={onCommit}
              className="text-[10px] font-medium text-zinc-900"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartEdit}
            className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-zinc-900 hover:text-zinc-600"
          >
            {earned} / {goal} pts
            <Pencil className="size-3 text-zinc-400" aria-hidden />
          </button>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-zinc-900 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type TidyGoalProgressBarsProps = {
  progress: TidyGoalProgress;
  compact?: boolean;
  onProgressChange?: (next: TidyGoalProgress) => void;
};

export function TidyGoalProgressBars({
  progress,
  compact,
  onProgressChange,
}: TidyGoalProgressBarsProps) {
  const [editing, setEditing] = useState<"daily" | "monthly" | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const commit = useCallback(async () => {
    const n = Math.max(1, Number.parseInt(draft, 10) || 1);
    setSaving(true);
    const supabase = createBrowserClientInstance();
    const patch =
      editing === "daily"
        ? { daily_goal: n }
        : editing === "monthly"
          ? { monthly_goal: n }
          : {};
    const { data, error } = await upsertTidyGoals(supabase, patch);
    setSaving(false);
    if (error || !data) {
      console.error(formatSupabaseError(error));
      return;
    }
    const next: TidyGoalProgress = {
      ...progress,
      daily_goal: data.daily_goal,
      monthly_goal: data.monthly_goal,
    };
    onProgressChange?.(next);
    setEditing(null);
  }, [draft, editing, onProgressChange, progress]);

  const wrapperClass = compact
    ? "flex flex-col gap-2 sm:flex-row sm:gap-3"
    : "mb-6 flex flex-col gap-2 sm:flex-row sm:gap-3";

  return (
    <div className={wrapperClass}>
      {compact ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:sr-only">
          Tidy Guild Progress
        </p>
      ) : null}
      <ProgressBar
        label="Today's goal"
        earned={progress.today_points}
        goal={progress.daily_goal}
        editing={editing === "daily" && !saving}
        editValue={draft}
        onStartEdit={() => {
          setEditing("daily");
          setDraft(String(progress.daily_goal));
        }}
        onEditChange={setDraft}
        onCommit={() => void commit()}
        onCancel={() => setEditing(null)}
      />
      <ProgressBar
        label="Monthly goal"
        earned={progress.month_points}
        goal={progress.monthly_goal}
        editing={editing === "monthly" && !saving}
        editValue={draft}
        onStartEdit={() => {
          setEditing("monthly");
          setDraft(String(progress.monthly_goal));
        }}
        onEditChange={setDraft}
        onCommit={() => void commit()}
        onCancel={() => setEditing(null)}
      />
    </div>
  );
}