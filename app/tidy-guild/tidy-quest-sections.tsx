"use client";

import { useMemo } from "react";

import type { SendToWeeklyResult } from "@/app/tidy-guild/send-to-weekly";
import { TaskCard } from "@/app/tidy-guild/task-card";
import {
  TIDY_QUEST_SECTIONS,
  TIDY_RECURRENCE_LEGACY_ONE_OFF,
  type TidyQuestSectionId,
} from "@/lib/tidy/constants";
import { quickWinTaskMatch } from "@/lib/tidy/micro-steps";
import { isTaskEffectivelyComplete } from "@/lib/tidy/task-reset";
import type { TidyTask } from "@/lib/supabase/types/tidy";
import type { DayKey } from "@/lib/weekly/constants";

type TidyQuestSectionsProps = {
  tasks: TidyTask[];
  quickWinsOnly: boolean;
  /** Monday YYYY-MM-DD for the active Weekly plan. */
  weekStart: string;
  todayDateIso: string;
  weeklySchedule: Record<string, DayKey>;
  /** ISO timestamp from server snapshot; keeps SSR and hydration in sync. */
  referenceNowIso: string;
  anytimeClaimCounts: Record<string, number>;
  undoingClaimTaskId: string | null;
  onClaim: (task: TidyTask) => void;
  onUndoClaim: (task: TidyTask) => void;
  onToggle: (task: TidyTask) => void;
  onToggleStep: (task: TidyTask, stepId: string, complete: boolean) => void;
  onEdit: (task: TidyTask) => void;
  onDelete: (task: TidyTask) => void;
  onWeeklyResult: (taskId: string, result: SendToWeeklyResult) => void;
  backdatingTaskId: string | null;
  onBackdate: (
    task: TidyTask,
    payload: { dateYmd: string; created_at: string },
  ) => void;
};

function taskSectionId(task: TidyTask): TidyQuestSectionId | null {
  if (task.recurrence === "anytime") return "anytime";
  if (
    task.recurrence === "side_quests" ||
    task.recurrence === TIDY_RECURRENCE_LEGACY_ONE_OFF
  ) {
    return "side_quests";
  }
  if (
    task.recurrence === "daily" ||
    task.recurrence === "weekly" ||
    task.recurrence === "biweekly" ||
    task.recurrence === "monthly"
  ) {
    return task.recurrence;
  }
  return null;
}

function includeInSection(
  task: TidyTask,
  sectionId: TidyQuestSectionId,
  referenceNow: Date,
): boolean {
  const bucket = taskSectionId(task);
  if (bucket !== sectionId) return false;

  if (sectionId === "side_quests") return true;
  if (sectionId === "anytime") return true;

  const done = isTaskEffectivelyComplete(
    task.recurrence,
    task.completed_at,
    referenceNow,
  );
  return !done;
}

export function TidyQuestSections({
  tasks,
  quickWinsOnly,
  weekStart,
  todayDateIso,
  weeklySchedule,
  referenceNowIso,
  anytimeClaimCounts,
  undoingClaimTaskId,
  onClaim,
  onUndoClaim,
  onToggle,
  onToggleStep,
  onEdit,
  onDelete,
  onWeeklyResult,
  backdatingTaskId,
  onBackdate,
}: TidyQuestSectionsProps) {
  const referenceNow = useMemo(
    () => new Date(referenceNowIso),
    [referenceNowIso],
  );

  return (
    <div className="space-y-6">
      {TIDY_QUEST_SECTIONS.map((section) => {
        const sectionTasks = tasks.filter((task) => {
          if (!includeInSection(task, section.id, referenceNow)) return false;
          if (quickWinsOnly && !quickWinTaskMatch(task, true, referenceNow)) {
            return false;
          }
          return true;
        });

        return (
          <section key={section.id}>
            <div className="border-b border-zinc-200 pb-1">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-900">
                  {section.title}
                </h3>
                <span className="text-[10px] font-medium tabular-nums text-zinc-500">
                  {sectionTasks.length}
                </span>
              </div>
              {section.subtitle ? (
                <p className="mt-0.5 text-xs text-zinc-600">{section.subtitle}</p>
              ) : null}
            </div>
            {sectionTasks.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No quests here yet.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {sectionTasks.map((task) => (
                  <li key={task.id}>
                    <TaskCard
                      task={task}
                      claimCount={anytimeClaimCounts[task.id] ?? 0}
                      referenceNowIso={referenceNowIso}
                      onClaim={() => onClaim(task)}
                      onUndoClaim={
                        (anytimeClaimCounts[task.id] ?? 0) > 0
                          ? () => onUndoClaim(task)
                          : undefined
                      }
                      undoingClaim={undoingClaimTaskId === task.id}
                      onToggle={() => onToggle(task)}
                      onToggleStep={(stepId, complete) =>
                        onToggleStep(task, stepId, complete)
                      }
                      onEdit={() => onEdit(task)}
                      onDelete={() => onDelete(task)}
                      weekStart={weekStart}
                      weekStartForWeekly={weekStart}
                      todayDateIso={todayDateIso}
                      scheduledDay={weeklySchedule[task.id] ?? null}
                      onWeeklyResult={(result) =>
                        onWeeklyResult(task.id, result)
                      }
                      backdating={backdatingTaskId === task.id}
                      onBackdate={(payload) => onBackdate(task, payload)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}