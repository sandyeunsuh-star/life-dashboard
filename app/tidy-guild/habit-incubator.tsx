"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { HabitPunchCard } from "@/app/tidy-guild/habit-punch-card";
import {
  HABIT_INCUBATOR_MAX,
  habitTargetLabel,
  habitTierMeta,
} from "@/lib/tidy/habit-constants";
import { computeHabitStreakMeta } from "@/lib/tidy/habit-streak";
import { todayLocalDateIso } from "@/lib/tidy/backdate-dates";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  deleteTidyHabit,
  habitCheckIn,
  habitUncheckIn,
  sumHabitLifetimePoints,
} from "@/lib/supabase/queries/tidy-habits";
import type { TidyHabitRow } from "@/lib/supabase/types/tidy-habit";

type HabitIncubatorProps = {
  habits: TidyHabitRow[];
  todayDateIso: string;
  onHabitsChange: (habits: TidyHabitRow[]) => void;
  onNewHabit: () => void;
  onEditHabit: (habit: TidyHabitRow) => void;
  onPointsChange: (balance: number) => void;
  onToast: (message: string) => void;
  onGraduated: (habit: TidyHabitRow, graduationPoints: number) => void;
  onProgressBump: () => void;
};

export function HabitIncubator({
  habits,
  todayDateIso,
  onHabitsChange,
  onNewHabit,
  onEditHabit,
  onPointsChange,
  onToast,
  onGraduated,
  onProgressBump,
}: HabitIncubatorProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lifetimePts, setLifetimePts] = useState<Record<string, number>>({});

  const incubating = useMemo(
    () => habits.filter((h) => h.status === "incubating"),
    [habits],
  );
  const established = useMemo(
    () =>
      habits.filter((h) => h.status === "established").sort((a, b) => {
        const at = a.established_at ?? a.updated_at;
        const bt = b.established_at ?? b.updated_at;
        return bt.localeCompare(at);
      }),
    [habits],
  );

  useEffect(() => {
    const supabase = createBrowserClientInstance();
    void (async () => {
      const map: Record<string, number> = {};
      await Promise.all(
        established.map(async (h) => {
          map[h.id] = await sumHabitLifetimePoints(supabase, h.id);
        }),
      );
      setLifetimePts(map);
    })();
  }, [established]);

  const today = todayDateIso || todayLocalDateIso();

  function replaceHabit(next: TidyHabitRow) {
    onHabitsChange(habits.map((h) => (h.id === next.id ? next : h)));
  }

  async function handleCheckIn(habit: TidyHabitRow, dateYmd: string) {
    setBusyId(habit.id);
    const supabase = createBrowserClientInstance();
    const { data, error } = await habitCheckIn(supabase, habit, dateYmd);
    setBusyId(null);
    if (error || !data) {
      onToast(formatSupabaseError(error) || "Could not check in");
      return;
    }
    replaceHabit(data.habit);
    onPointsChange(data.balance);
    onProgressBump();
    if (data.graduated) {
      onGraduated(data.habit, data.graduationPoints);
    } else {
      onToast(`+${data.dailyPoints} pts · ${habit.title}`);
    }
  }

  async function handleUncheck(habit: TidyHabitRow, dateYmd: string) {
    setBusyId(habit.id);
    const supabase = createBrowserClientInstance();
    const { data, error } = await habitUncheckIn(supabase, habit, dateYmd);
    setBusyId(null);
    if (error || !data) {
      onToast(formatSupabaseError(error) || "Could not undo check-in");
      return;
    }
    replaceHabit(data.habit);
    onPointsChange(data.balance);
    onProgressBump();
    onToast(`Undid +${data.dailyPoints} pts for ${dateYmd}`);
  }

  function handleToggleDate(
    habit: TidyHabitRow,
    dateYmd: string,
    currentlyChecked: boolean,
  ) {
    if (currentlyChecked) {
      void handleUncheck(habit, dateYmd);
    } else {
      void handleCheckIn(habit, dateYmd);
    }
  }

  async function handleDelete(habit: TidyHabitRow) {
    if (!window.confirm(`Remove “${habit.title}”?`)) return;
    setBusyId(habit.id);
    const supabase = createBrowserClientInstance();
    const { error } = await deleteTidyHabit(supabase, habit.id);
    setBusyId(null);
    if (error) {
      onToast(formatSupabaseError(error));
      return;
    }
    onHabitsChange(habits.filter((h) => h.id !== habit.id));
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            Habit Incubator
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600">
            Tap circles to check in — one grace gap won&apos;t break your streak.
          </p>
        </div>
        <button
          type="button"
          onClick={onNewHabit}
          disabled={incubating.length >= HABIT_INCUBATOR_MAX}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-40"
        >
          <Plus className="size-4" />
          New habit
        </button>
      </header>

      {incubating.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          No habits incubating yet. Start one small routine — up to{" "}
          {HABIT_INCUBATOR_MAX} at a time.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {incubating.map((habit) => {
            const { streak, graceUsed } = computeHabitStreakMeta(
              habit.check_in_dates,
            );
            const tierMeta = habitTierMeta(habit.tier);
            const busy = busyId === habit.id;

            return (
              <li
                key={habit.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {habit.title}
                    </h3>
                    {habit.anchor_cue ? (
                      <p className="mt-0.5 text-xs text-zinc-600">
                        {habit.anchor_cue}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-900">
                        Day {streak} / {habit.target_days}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {tierMeta.title}
                      </span>
                      {graceUsed ? (
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                          🛡️ Grace Shield Used (1 day gap)
                        </span>
                      ) : null}
                      <span className="text-[10px] font-medium tabular-nums text-zinc-500">
                        +{habit.graduation_points} at ESTABLISHED
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => onEditHabit(habit)}
                      className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
                      aria-label="Edit habit"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete(habit)}
                      className="rounded-lg p-2 text-zinc-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                      aria-label="Delete habit"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <HabitPunchCard
                  habit={habit}
                  todayYmd={today}
                  busy={busy}
                  onToggleDate={(ymd, checked) =>
                    handleToggleDate(habit, ymd, checked)
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      {established.length > 0 ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Established — Hall of Fame
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {established.map((habit) => {
              const completed = habit.established_at
                ? new Date(habit.established_at).toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )
                : "—";
              const total = lifetimePts[habit.id] ?? "…";

              return (
                <li
                  key={habit.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                >
                  <p className="text-sm font-semibold text-zinc-900">
                    {habit.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Graduated {completed}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-800">
                      {habitTargetLabel(habit.target_days)}
                    </span>
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium tabular-nums text-zinc-600">
                      {typeof total === "number"
                        ? `${total} pts total`
                        : total}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}