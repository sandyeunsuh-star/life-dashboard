"use client";

import { CalendarPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { revalidateWeeklyHome } from "@/app/actions/revalidate-weekly-home";
import {
  DAY_KEYS,
  DAY_LABELS,
  type DayKey,
} from "@/lib/weekly/constants";
import {
  parseDateString,
  todayDayKey,
  toDateString,
} from "@/lib/weekly/dates";
import { tidyWeeklyScheduleLabel } from "@/lib/weekly/tidy-schedule";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { sendTidyTaskToWeekly } from "@/lib/supabase/queries/weekly-tidy-sync";
import type { TidyTask } from "@/lib/supabase/types/tidy";

export type SendToWeeklyResult = {
  success: boolean;
  day: DayKey | null;
  message: string;
};

function dayPillLabel(day: DayKey, weekStart: string, today: DayKey | null) {
  if (today === day) return "Today";
  const raw = DAY_LABELS[day];
  return raw.charAt(0) + raw.slice(1, 3).toLowerCase();
}

type WeeklyScheduleBadgeProps = {
  scheduledDay: DayKey;
  weekStart: string;
};

export function WeeklyScheduleBadge({
  scheduledDay,
  weekStart,
}: WeeklyScheduleBadgeProps) {
  return (
    <span
      className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-700"
      onClick={(e) => e.stopPropagation()}
    >
      Scheduled: {tidyWeeklyScheduleLabel(scheduledDay, weekStart)}
    </span>
  );
}

type SendToWeeklyToggleProps = {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

export function SendToWeeklyToggle({
  active,
  disabled,
  onToggle,
}: SendToWeeklyToggleProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition disabled:opacity-50 ${
        active
          ? "border-zinc-900 bg-zinc-100 text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      <CalendarPlus className="size-3" />
      Send to Weekly
    </button>
  );
}

type SendToWeeklyInlineBarProps = {
  task: TidyTask;
  weekStart: string;
  todayDateIso: string;
  referenceNow?: Date;
  onResult: (result: SendToWeeklyResult) => void;
  onDone?: () => void;
};

export function SendToWeeklyInlineBar({
  task,
  weekStart,
  todayDateIso,
  referenceNow,
  onResult,
  onDone,
}: SendToWeeklyInlineBarProps) {
  const [loading, setLoading] = useState(false);
  const [liveTodayIso, setLiveTodayIso] = useState(todayDateIso);

  const clock =
    liveTodayIso === todayDateIso
      ? (referenceNow ?? parseDateString(todayDateIso))
      : parseDateString(liveTodayIso);

  const today = todayDayKey(weekStart, clock);

  useEffect(() => {
    setLiveTodayIso(toDateString(new Date()));
  }, []);

  async function send(day: DayKey) {
    setLoading(true);
    const supabase = createBrowserClientInstance();
    const { data, error } = await sendTidyTaskToWeekly(supabase, {
      tidyTask: task,
      day,
      weekStart,
    });
    setLoading(false);

    const dayLabel = dayPillLabel(day, weekStart, today);

    if (error) {
      onResult({
        success: false,
        day: null,
        message: formatSupabaseError(error) || "Could not add to Weekly",
      });
      return;
    }

    if (!data) {
      onResult({
        success: false,
        day: null,
        message: "Could not add to Weekly — no response from server.",
      });
      return;
    }

    const message = data.alreadyScheduled
      ? `Already on Weekly · ${tidyWeeklyScheduleLabel(data.day, weekStart)}`
      : `Sent to ${dayLabel}!`;

    onResult({ success: true, day: data.day, message });
    onDone?.();

    try {
      await revalidateWeeklyHome();
    } catch (err) {
      console.error("[SendToWeekly] revalidateWeeklyHome failed:", err);
    }
  }

  return (
    <div
      className="border-t border-zinc-100 bg-zinc-50/80 px-3 py-2.5"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Add to this week
      </p>
      <div className="flex flex-wrap gap-1.5">
        {DAY_KEYS.map((day) => {
          const isToday = today === day;
          const label = dayPillLabel(day, weekStart, today);
          return (
            <button
              key={day}
              type="button"
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                void send(day);
              }}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:opacity-40 ${
                isToday
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}