"use client";

import { Calendar, ChevronDown } from "lucide-react";
import { useState } from "react";

import { PointLogChangeDate } from "@/app/tidy-guild/point-log-change-date";
import type { TidyGoalProgress } from "@/lib/supabase/types/tidy-goals";
import type { TidyHistoryDay } from "@/lib/supabase/queries/tidy-goals";
type TidyGuildHistoryProps = {
  progress: TidyGoalProgress;
  days: TidyHistoryDay[];
  todayDateIso: string;
  onChangeDate?: (
    logId: string,
    payload: { dateYmd: string; created_at: string },
  ) => void;
  changingDateId?: string | null;
};

export function TidyGuildHistory({
  progress,
  days,
  todayDateIso,
  onChangeDate,
  changingDateId = null,
}: TidyGuildHistoryProps) {
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const [dateEditId, setDateEditId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <HistorySummary progress={progress} />

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <h2 className="border-b border-zinc-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-900">
          Day-by-day log
        </h2>
        {days.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            No point wins yet — complete a quest to start.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {days.map((day) => {
              const open = openDays[day.dateKey] ?? false;
              return (
                <li key={day.dateKey}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenDays((prev) => ({
                        ...prev,
                        [day.dateKey]: !open,
                      }))
                    }
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-50"
                  >
                    <span className="text-sm font-medium text-zinc-900">
                      {day.label} · +{day.points} pts · {day.wins}{" "}
                      {day.wins === 1 ? "win" : "wins"}
                    </span>
                    <ChevronDown
                      className={`size-4 shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open ? (
                    <ul className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-2">
                      {day.entries.map((entry) => {
                        const editing = dateEditId === entry.id;
                        return (
                          <li
                            key={entry.id}
                            className="group border-b border-zinc-100 py-2 last:border-0"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm text-zinc-900">
                                  {entry.label}
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  {entry.source}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {onChangeDate ? (
                                  <button
                                    type="button"
                                    disabled={changingDateId === entry.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDateEditId((id) =>
                                        id === entry.id ? null : entry.id,
                                      );
                                    }}
                                    className="rounded-lg border border-transparent px-2 py-0.5 text-[10px] font-medium text-zinc-500 opacity-0 transition hover:border-zinc-200 hover:bg-white hover:text-zinc-900 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
                                  >
                                    {changingDateId === entry.id ? (
                                      "…"
                                    ) : (
                                      <span className="inline-flex items-center gap-1">
                                        <Calendar
                                          className="size-3"
                                          aria-hidden
                                        />
                                        Change date
                                      </span>
                                    )}
                                  </button>
                                ) : null}
                                <span className="text-xs font-semibold tabular-nums text-zinc-900">
                                  +{entry.points}
                                </span>
                              </div>
                            </div>
                            {editing && onChangeDate ? (
                              <PointLogChangeDate
                                maxDate={todayDateIso}
                                loading={changingDateId === entry.id}
                                onConfirm={(payload) => {
                                  onChangeDate(entry.id, payload);
                                  setDateEditId(null);
                                }}
                                onCancel={() => setDateEditId(null)}
                              />
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function HistorySummary({ progress }: { progress: TidyGoalProgress }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SummaryCard
        title="Today"
        points={progress.today_points}
        wins={progress.today_wins}
      />
      <SummaryCard
        title="This week"
        points={progress.week_points}
        wins={progress.week_wins}
      />
      <SummaryCard
        title="This month"
        points={progress.month_points}
        wins={progress.month_wins}
      />
    </div>
  );
}

function SummaryCard({
  title,
  points,
  wins,
}: {
  title: string;
  points: number;
  wins: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">
        +{points} pts
      </p>
      <p className="text-xs text-zinc-600">
        {wins} {wins === 1 ? "task" : "tasks"} completed
      </p>
    </div>
  );
}