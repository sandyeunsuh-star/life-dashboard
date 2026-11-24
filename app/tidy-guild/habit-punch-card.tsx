"use client";

import { Check, Sparkles } from "lucide-react";
import { useState } from "react";

import { HABIT_DAILY_POINTS } from "@/lib/tidy/habit-constants";
import {
  computeHabitStreakMeta,
  currentCalendarWeekDates,
  findGraceGapInActiveChain,
} from "@/lib/tidy/habit-streak";
import type { TidyHabitRow } from "@/lib/supabase/types/tidy-habit";

type HabitPunchCardProps = {
  habit: TidyHabitRow;
  todayYmd: string;
  busy?: boolean;
  onToggleDate: (dateYmd: string, checked: boolean) => void;
};

export function HabitPunchCard({
  habit,
  todayYmd,
  busy,
  onToggleDate,
}: HabitPunchCardProps) {
  const { streak, graceUsed } = computeHabitStreakMeta(habit.check_in_dates);
  const graceGapYmd = findGraceGapInActiveChain(habit.check_in_dates);
  const checkedToday = habit.check_in_dates.includes(todayYmd);
  const week = currentCalendarWeekDates(todayYmd);
  const [bumpIndex, setBumpIndex] = useState<number | null>(null);

  const target = habit.target_days;
  const todayPunchIndex = checkedToday
    ? streak
    : Math.min(streak + 1, target);

  function toggleTodayFromPunch() {
    setBumpIndex(todayPunchIndex);
    window.setTimeout(() => setBumpIndex(null), 320);
    onToggleDate(todayYmd, checkedToday);
  }

  function toggleWeekDay(ymd: string) {
    if (ymd > todayYmd) return;
    const checked = habit.check_in_dates.includes(ymd);
    onToggleDate(ymd, checked);
  }

  const punchRows: number[][] = [];
  for (let i = 0; i < target; i += 7) {
    punchRows.push(
      Array.from({ length: Math.min(7, target - i) }, (_, j) => i + j + 1),
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          This week
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {week.map(({ label, ymd }) => {
            const isFuture = ymd > todayYmd;
            const checked = habit.check_in_dates.includes(ymd);
            const isGraceGap = !checked && ymd === graceGapYmd;
            const isToday = ymd === todayYmd;

            return (
              <button
                key={ymd}
                type="button"
                disabled={busy || isFuture}
                title={
                  isGraceGap
                    ? "Grace shield — 1 day gap protected"
                    : isToday
                      ? `Today (${ymd})`
                      : ymd
                }
                onClick={() => toggleWeekDay(ymd)}
                className="flex flex-col items-center gap-0.5 disabled:opacity-40"
              >
                <span className="text-[9px] font-medium text-zinc-500">
                  {label}
                </span>
                <span
                  className={`relative flex size-7 items-center justify-center rounded-full text-[10px] transition-transform active:scale-90 ${
                    checked
                      ? "bg-zinc-900 text-white"
                      : isGraceGap
                        ? "border border-dashed border-zinc-400 bg-zinc-50/50"
                        : isToday
                          ? "border-2 border-zinc-900 bg-white hover:bg-zinc-100"
                          : "border border-zinc-200 bg-zinc-50/70 hover:bg-white"
                  }`}
                >
                  {checked ? (
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                  ) : isGraceGap ? (
                    <span className="text-[11px]" aria-hidden>
                      🛡️
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Punch card
        </p>
        <div className="space-y-2">
          {punchRows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex flex-wrap gap-2">
              {row.map((dayIndex) => {
                const isGrad = dayIndex === target;
                const filled = dayIndex <= streak;
                const isTodayPunch = dayIndex === todayPunchIndex;
                const isBump = bumpIndex === dayIndex;
                const canTapToday = isTodayPunch;

                return (
                  <button
                    key={dayIndex}
                    type="button"
                    disabled={busy || !canTapToday}
                    title={
                      canTapToday && !checkedToday
                        ? `Tap to check in Today (+${HABIT_DAILY_POINTS} pts)`
                        : canTapToday && checkedToday
                          ? "Tap to undo today's check-in"
                          : `Day ${dayIndex}`
                    }
                    onClick={() => {
                      if (!canTapToday) return;
                      void toggleTodayFromPunch();
                    }}
                    className={`group relative flex size-9 items-center justify-center rounded-full transition-all duration-200 ease-out ${
                      isBump ? "scale-110" : "scale-100"
                    } ${
                      filled
                        ? "bg-zinc-900 text-white shadow-sm"
                        : canTapToday && !checkedToday
                          ? "animate-pulse border-2 border-zinc-900 bg-white ring-2 ring-zinc-900/10 hover:bg-zinc-100"
                          : "border border-zinc-200 bg-zinc-50/70"
                    } ${canTapToday ? "cursor-pointer" : "cursor-default"}`}
                  >
                    {filled ? (
                      isGrad ? (
                        <Sparkles
                          className="size-3.5 text-white"
                          aria-hidden
                        />
                      ) : (
                        <Check
                          className="size-3.5 opacity-90"
                          strokeWidth={3}
                          aria-hidden
                        />
                      )
                    ) : isGrad ? (
                      <Sparkles
                        className="size-3 text-zinc-400"
                        aria-hidden
                      />
                    ) : (
                      <span className="text-[10px] font-medium tabular-nums text-zinc-400">
                        {dayIndex}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {graceUsed ? (
        <p className="text-[10px] text-zinc-500">
          Grace shield active on this streak — one single-day gap is forgiven.
        </p>
      ) : null}
    </div>
  );
}