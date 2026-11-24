"use client";

import { Calendar, ChevronDown, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";

import { PointLogChangeDate } from "@/app/tidy-guild/point-log-change-date";
import { pointLogRowAmount } from "@/lib/supabase/tidy-point-log";
import type { TidyPointLogKind, TidyPointWin } from "@/lib/supabase/types/tidy";

const COLLAPSED_KEY = "life-dashboard:tidy-recent-wins-collapsed";

const KIND_LABEL: Partial<Record<TidyPointLogKind, string>> = {
  weekly_task: "Weekly",
  vault_skip: "Vault",
  task_complete: "Quest",
  anytime_claim: "Anytime",
  ad_hoc_win: "Quick win",
  habit_checkin: "Habit",
  habit_graduation: "Habit grad",
};

function winLabel(win: TidyPointWin): string {
  if (win.reason?.trim()) {
    return win.reason.replace(/^Weekly:\s*/i, "");
  }
  const kind = KIND_LABEL[win.kind] ?? "Earned";
  return kind;
}

type RecentPointWinsProps = {
  wins: TidyPointWin[];
  todayDateIso: string;
  onUndo?: (win: TidyPointWin) => void;
  undoingId?: string | null;
  onChangeDate?: (
    win: TidyPointWin,
    payload: { dateYmd: string; created_at: string },
  ) => void;
  changingDateId?: string | null;
};

export function RecentPointWins({
  wins,
  todayDateIso,
  onUndo,
  undoingId = null,
  onChangeDate,
  changingDateId = null,
}: RecentPointWinsProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dateEditId, setDateEditId] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(COLLAPSED_KEY) === "1") {
        setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (wins.length === 0) {
    return null;
  }

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <section className="mb-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
          Recent point wins
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-zinc-600 transition ${collapsed ? "" : "rotate-180"}`}
        />
      </button>
      {!collapsed ? (
        <ul className="max-h-80 divide-y divide-zinc-100 overflow-y-auto border-t border-zinc-100">
          {wins.map((win) => {
            const when = new Date(win.created_at);
            const timeLabel = Number.isNaN(when.getTime())
              ? ""
              : when.toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                });
            const tag = KIND_LABEL[win.kind] ?? win.kind;
            const pts = pointLogRowAmount(win);
            const editing = dateEditId === win.id;
            return (
              <li
                key={win.id}
                className="group px-4 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {winLabel(win)}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {tag}
                      {timeLabel ? ` · ${timeLabel}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {onChangeDate ? (
                      <button
                        type="button"
                        disabled={changingDateId === win.id}
                        onClick={() =>
                          setDateEditId((id) => (id === win.id ? null : win.id))
                        }
                        className="rounded-lg border border-transparent px-2 py-1 text-xs font-medium text-zinc-500 opacity-0 transition hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
                        aria-label="Change date"
                      >
                        {changingDateId === win.id ? (
                          "…"
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-3" aria-hidden />
                            Change date
                          </span>
                        )}
                      </button>
                    ) : null}
                    {onUndo ? (
                      <button
                        type="button"
                        disabled={undoingId === win.id}
                        onClick={() => onUndo(win)}
                        className="rounded-lg border border-transparent px-2 py-1 text-xs font-medium text-zinc-500 opacity-0 transition hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
                        aria-label={`Undo +${pts} pts`}
                      >
                        {undoingId === win.id ? (
                          "…"
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Undo2 className="size-3" aria-hidden />
                            Undo
                          </span>
                        )}
                      </button>
                    ) : null}
                    <span className="text-sm font-semibold tabular-nums text-zinc-900">
                      +{pts}
                    </span>
                  </div>
                </div>
                {editing && onChangeDate ? (
                  <PointLogChangeDate
                    maxDate={todayDateIso}
                    loading={changingDateId === win.id}
                    onConfirm={(payload) => {
                      onChangeDate(win, payload);
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
    </section>
  );
}