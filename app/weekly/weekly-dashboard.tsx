"use client";

import { ChevronLeft, ChevronRight, LayoutTemplate, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { backfillWeeklyCheckedPointTasks } from "@/lib/supabase/queries/weekly-tidy-sync";
import { revalidateAfterTidyPoints } from "@/lib/tidy/revalidate-after-points";

import type { ShipmentRow } from "@/lib/supabase/types/shipment";
import type { TidyTask } from "@/lib/supabase/types/tidy";
import type { VaultItem } from "@/lib/supabase/types/vault";
import type { UserSettingsRow } from "@/lib/supabase/types/user-settings";
import type { WeeklyPlanRow } from "@/lib/supabase/types/weekly-plan";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import {
  createShipment,
  deleteShipment,
  updateShipment,
} from "@/lib/supabase/queries/shipments";
import {
  updateRecurringTemplate,
  updateUserQuickCopy,
} from "@/lib/supabase/queries/user-settings";
import {
  startNextWeek,
  upsertWeeklyPlanDays,
} from "@/lib/supabase/queries/weekly-plans";
import {
  DAY_KEYS,
  type DayKey,
  type QuickCopySettings,
  type RecurringTemplate,
  type ShipmentStatus,
  type WeeklyDays,
  type WeeklyTask,
} from "@/lib/weekly/constants";
import { formatWeekRange, nextDayKey, todayDayKey } from "@/lib/weekly/dates";
import { moveTaskToNextDay } from "@/lib/weekly/plan-helpers";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  claimAnytimeFromWeekly,
  syncWeeklyTaskChecked,
} from "@/lib/supabase/queries/weekly-tidy-sync";

import { DaySection } from "./day-section";
import { QuickCopyBar } from "./quick-copy-bar";
import { ShipmentsCard } from "./shipments-card";
import { VaultTemperatureWidget } from "./vault-temperature-widget";
import { TidyGuildProgressStrip } from "./tidy-guild-progress-strip";
import { CurrentsWhisperNudge } from "./currents-whisper-nudge";
import { TemplateModal } from "./template-modal";

type WeeklyDashboardProps = {
  initialPlan: WeeklyPlanRow;
  weekStarts: string[];
  settings: UserSettingsRow;
  initialShipments: ShipmentRow[];
  initialVaultPaused: VaultItem[];
  vaultPausedCount: number;
  initialTidyTasks: TidyTask[];
  currentsCurrentYm?: string;
  showCurrentsNudge?: boolean;
};

export function WeeklyDashboard({
  initialPlan,
  weekStarts,
  settings,
  initialShipments,
  initialVaultPaused,
  vaultPausedCount,
  initialTidyTasks,
  currentsCurrentYm,
  showCurrentsNudge = false,
}: WeeklyDashboardProps) {
  const router = useRouter();
  const supabase = createBrowserClientInstance();

  const [plan, setPlan] = useState(initialPlan);
  const [days, setDays] = useState<WeeklyDays>(initialPlan.days);
  const [quickCopy, setQuickCopy] = useState<QuickCopySettings>(
    settings.quick_copy,
  );
  const [template, setTemplate] = useState<RecurringTemplate>(
    settings.recurring_template,
  );
  const [shipments, setShipments] = useState(initialShipments);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [nextWeekOpen, setNextWeekOpen] = useState(false);
  const [rollOver, setRollOver] = useState(true);
  const [startingWeek, setStartingWeek] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tidyProgressRefresh, setTidyProgressRefresh] = useState(0);

  const tidyTasksById = useMemo(() => {
    const map: Record<string, TidyTask> = {};
    for (const t of initialTidyTasks) {
      map[t.id] = t;
    }
    return map;
  }, [initialTidyTasks]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const daysRef = useRef(days);
  daysRef.current = days;
  const backfilledRef = useRef(false);

  useEffect(() => {
    setPlan(initialPlan);
    setDays(initialPlan.days);
  }, [initialPlan]);

  const persistDays = useCallback(
    (nextDays: WeeklyDays) => {
      setDays(nextDays);
      daysRef.current = nextDays;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const { error } = await upsertWeeklyPlanDays(
          supabase,
          plan.id,
          nextDays,
        );
        if (error) {
          console.error(
            "[weekly_plans] save failed:",
            formatSupabaseError(error),
          );
        }
      }, 350);
    },
    [plan.id, supabase],
  );

  const weekIndex = weekStarts.indexOf(plan.week_start);
  const canGoNewer = weekIndex > 0;
  const canGoOlder =
    weekIndex >= 0 ? weekIndex < weekStarts.length - 1 : weekStarts.length > 0;

  function goToWeek(weekStart: string) {
    router.push(weekStart === weekStarts[0] ? "/" : `/?week=${weekStart}`);
  }

  function goNewer() {
    if (!canGoNewer) return;
    goToWeek(weekStarts[weekIndex - 1]);
  }

  function goOlder() {
    if (!canGoOlder) return;
    const idx = weekIndex < 0 ? weekStarts.length - 1 : weekIndex + 1;
    goToWeek(weekStarts[idx]);
  }

  const todayKey = todayDayKey(plan.week_start);

  function setDayTasks(day: DayKey, tasks: WeeklyDays[DayKey]) {
    const next = { ...daysRef.current, [day]: tasks };
    persistDays(next);
  }

  function handleMoveToTomorrow(day: DayKey, taskId: string) {
    const next = moveTaskToNextDay(daysRef.current, day, taskId);
    persistDays(next);
  }

  const showTidyToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3600);
  }, []);

  useEffect(() => {
    if (backfilledRef.current) return;
    backfilledRef.current = true;
    void (async () => {
      const { credited, error } = await backfillWeeklyCheckedPointTasks(
        supabase,
        plan.id,
        daysRef.current,
      );
      if (error) {
        console.error("[weekly] backfill points failed:", formatSupabaseError(error));
        return;
      }
      if (credited > 0) {
        showTidyToast(`+${credited} pts from completed Weekly tasks`);
        await revalidateAfterTidyPoints();
        setTidyProgressRefresh((n) => n + 1);
      }
    })();
  }, [plan.id, showTidyToast, supabase]);

  const handleToggleTask = useCallback(
    async (day: DayKey, task: WeeklyTask, checked: boolean) => {
      const priorDays = daysRef.current;
      const tidy = task.tidy_task_id
        ? tidyTasksById[task.tidy_task_id]
        : undefined;
      if (tidy?.recurrence === "anytime") {
        return;
      }

      const taskInPlan =
        (priorDays[day] ?? []).find((t) => t.id === task.id) ?? task;

      const nextDays = { ...priorDays };
      nextDays[day] = (nextDays[day] ?? []).map((t) =>
        t.id === task.id ? { ...t, checked } : t,
      );
      daysRef.current = nextDays;
      setDays(nextDays);

      const { days: serverDays, pointsDelta, error } =
        await syncWeeklyTaskChecked(
          supabase,
          plan.id,
          nextDays,
          day,
          { ...taskInPlan, checked },
          checked,
          tidy ?? null,
        );

      if (error) {
        console.error(
          "[weekly] point sync failed:",
          formatSupabaseError(error),
        );
        daysRef.current = priorDays;
        setDays(priorDays);
        showTidyToast("Could not sync Tidy points — check console");
        return;
      }
      if (serverDays) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        setDays(serverDays);
        daysRef.current = serverDays;
      }
      if (pointsDelta !== 0) {
        const sign = pointsDelta > 0 ? "+" : "";
        showTidyToast(`${sign}${pointsDelta} pts`);
        await revalidateAfterTidyPoints();
        setTidyProgressRefresh((n) => n + 1);
      }
    },
    [plan.id, showTidyToast, supabase, tidyTasksById],
  );

  const handleAnytimeClaim = useCallback(
    async (day: DayKey, task: WeeklyTask) => {
      if (!task.tidy_task_id) return;
      const tidy = tidyTasksById[task.tidy_task_id];
      if (!tidy || tidy.recurrence !== "anytime") return;

      const { days: serverDays, pointsDelta, error } =
        await claimAnytimeFromWeekly(
          supabase,
          plan.id,
          daysRef.current,
          day,
          task,
          tidy,
        );

      if (error) {
        console.error(formatSupabaseError(error));
        return;
      }
      if (serverDays) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        setDays(serverDays);
        daysRef.current = serverDays;
      }
      if (pointsDelta > 0) {
        showTidyToast(`+${pointsDelta} pts`);
        await revalidateAfterTidyPoints();
        setTidyProgressRefresh((n) => n + 1);
      }
    },
    [plan.id, showTidyToast, supabase, tidyTasksById],
  );

  return (
    <div className="space-y-8">
      <TidyGuildProgressStrip refreshToken={tidyProgressRefresh} />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goOlder}
              disabled={!canGoOlder}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              aria-label="Previous week"
            >
              <ChevronLeft className="size-4" />
            </button>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
              {formatWeekRange(plan.week_start)}
            </h1>
            <button
              type="button"
              onClick={goNewer}
              disabled={!canGoNewer}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTemplateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <LayoutTemplate className="size-4" aria-hidden />
              Template
            </button>
            <button
              type="button"
              onClick={() => setNextWeekOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Plus className="size-4" aria-hidden />
              Start Next Week
            </button>
          </div>
        </div>

        <QuickCopyBar
          quickCopy={quickCopy}
          onSave={async (next) => {
            const { data, error } = await updateUserQuickCopy(supabase, next);
            if (error) throw error;
            if (data) setQuickCopy(data.quick_copy);
          }}
        />
      </div>

      {showCurrentsNudge && currentsCurrentYm ? (
        <CurrentsWhisperNudge currentYm={currentsCurrentYm} />
      ) : null}

      <ShipmentsCard
        shipments={shipments}
        onCreate={async (payload) => {
          const { data, error } = await createShipment(supabase, payload);
          if (error) throw error;
          if (data) setShipments((s) => [data, ...s]);
        }}
        onUpdate={async (id, patch) => {
          const { data, error } = await updateShipment(supabase, id, {
            label: patch.label,
            status: patch.status as ShipmentStatus | undefined,
            tracking_number: patch.tracking_number,
            tracking_url: patch.tracking_url,
            notes: patch.notes,
            is_delivered: patch.is_delivered,
          });
          if (error) throw error;
          if (data) {
            setShipments((list) =>
              list.map((s) => (s.id === id ? data : s)),
            );
          }
        }}
        onDelete={async (id) => {
          const { error } = await deleteShipment(supabase, id);
          if (error) throw error;
          setShipments((list) => list.filter((s) => s.id !== id));
        }}
      />

      <VaultTemperatureWidget
        initialPaused={initialVaultPaused}
        totalPausedCount={vaultPausedCount}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {DAY_KEYS.map((day) => (
          <DaySection
            key={day}
            day={day}
            weekStart={plan.week_start}
            isToday={todayKey === day}
            tasks={days[day] ?? []}
            tidyTasksById={tidyTasksById}
            onChange={(tasks) => setDayTasks(day, tasks)}
            onToggleTask={async (task, checked) => {
              await handleToggleTask(day, task, checked);
            }}
            onAnytimeClaim={async (task) => {
              await handleAnytimeClaim(day, task);
            }}
            onMoveToTomorrow={(taskId) => handleMoveToTomorrow(day, taskId)}
            canMoveToTomorrow={nextDayKey(day) !== null}
          />
        ))}
      </div>

      <TemplateModal
        open={templateOpen}
        template={template}
        onClose={() => setTemplateOpen(false)}
        onSave={async (next) => {
          const { data, error } = await updateRecurringTemplate(supabase, next);
          if (error) throw error;
          if (data) setTemplate(data.recurring_template);
          setTemplateOpen(false);
        }}
      />

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl border border-zinc-200 bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}

      {nextWeekOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/20"
            aria-label="Close"
            onClick={() => setNextWeekOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-zinc-900">
              Start next week?
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Creates a plan for the following Monday using your template.
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={rollOver}
                onChange={(e) => setRollOver(e.target.checked)}
                className="mt-0.5 size-4 rounded border-zinc-300"
              />
              Roll over unchecked tasks from current week
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNextWeekOpen(false)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={startingWeek}
                onClick={async () => {
                  setStartingWeek(true);
                  try {
                    const { data, error } = await startNextWeek(supabase, {
                      currentWeekStart: plan.week_start,
                      rollOverUnchecked: rollOver,
                    });
                    if (error && error.code !== "week_exists") throw error;
                    setNextWeekOpen(false);
                    if (data) {
                      router.push(`/?week=${data.week_start}`);
                      router.refresh();
                    }
                  } finally {
                    setStartingWeek(false);
                  }
                }}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {startingWeek ? "Creating…" : "Create week"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}