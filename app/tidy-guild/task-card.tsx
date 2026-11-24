"use client";

import { CalendarPlus, ChevronDown, Pencil, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { QuestBackdateInline } from "@/app/tidy-guild/quest-backdate-inline";
import {
  SendToWeeklyInlineBar,
  SendToWeeklyToggle,
  WeeklyScheduleBadge,
  type SendToWeeklyResult,
} from "@/app/tidy-guild/send-to-weekly";
import { tidyIconOption, tidyRecurrenceLabel } from "@/lib/tidy/constants";
import type { DayKey } from "@/lib/weekly/constants";
import {
  displayMicroSteps,
  microStepProgress,
} from "@/lib/tidy/micro-steps";
import { isTaskEffectivelyComplete } from "@/lib/tidy/task-reset";
import type { TidyTask } from "@/lib/supabase/types/tidy";

type TaskCardProps = {
  task: TidyTask;
  claimCount?: number;
  onToggle: () => void;
  onClaim?: () => void;
  onUndoClaim?: () => void;
  undoingClaim?: boolean;
  onToggleStep: (stepId: string, complete: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  weekStart?: string;
  scheduledDay?: DayKey | null;
  onWeeklyResult?: (result: SendToWeeklyResult) => void;
  weekStartForWeekly: string;
  todayDateIso: string;
  referenceNowIso?: string;
  backdating?: boolean;
  onBackdate?: (payload: {
    dateYmd: string;
    created_at: string;
  }) => void;
};

export function TaskCard(props: TaskCardProps) {
  return <TaskCardShell {...props} />;
}

function TaskCardShell({
  task,
  claimCount = 0,
  onToggle,
  onClaim,
  onUndoClaim,
  undoingClaim,
  onToggleStep,
  onEdit,
  onDelete,
  weekStart,
  scheduledDay = null,
  onWeeklyResult,
  weekStartForWeekly,
  todayDateIso,
  referenceNowIso,
  backdating,
  onBackdate,
}: TaskCardProps) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [backdateOpen, setBackdateOpen] = useState(false);

  const referenceNow = useMemo(
    () => (referenceNowIso ? new Date(referenceNowIso) : new Date()),
    [referenceNowIso],
  );
  const isAnytime = task.recurrence === "anytime";
  const done = isAnytime
    ? false
    : isTaskEffectivelyComplete(
        task.recurrence,
        task.completed_at,
        referenceNow,
      );
  const steps = displayMicroSteps(task, referenceNow);
  const { done: stepsDone, total: stepsTotal } = microStepProgress(steps);
  const icon = tidyIconOption(task.icon_key);
  const Icon = icon.icon;

  const showWeekly =
    Boolean(onWeeklyResult) &&
    !isAnytime &&
    weekStartForWeekly.length > 0 &&
    !scheduledDay;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <TaskCardHeader
        done={done}
        iconTint={icon.tint}
        Icon={Icon}
        task={task}
        isAnytime={isAnytime}
        claimCount={claimCount}
        onToggle={onToggle}
        onClaim={onClaim}
        onUndoClaim={onUndoClaim}
        undoingClaim={undoingClaim}
        onEdit={onEdit}
        onDelete={onDelete}
        stepsTotal={stepsTotal}
        stepsDone={stepsDone}
        stepsOpen={stepsOpen}
        onStepsToggle={() => setStepsOpen((o) => !o)}
        weekStartForWeekly={weekStartForWeekly}
        scheduledDay={scheduledDay}
        showWeekly={showWeekly}
        weeklyOpen={weeklyOpen}
        onWeeklyToggle={() => {
          setBackdateOpen(false);
          setWeeklyOpen((o) => !o);
        }}
        backdateOpen={backdateOpen}
        onBackdateToggle={() => {
          setWeeklyOpen(false);
          setBackdateOpen((o) => !o);
        }}
        hasBackdate={Boolean(onBackdate)}
      />
      {weeklyOpen && showWeekly && onWeeklyResult ? (
        <SendToWeeklyInlineBar
          task={task}
          weekStart={weekStartForWeekly}
          todayDateIso={todayDateIso}
          referenceNow={referenceNow}
          onResult={onWeeklyResult}
          onDone={() => setWeeklyOpen(false)}
        />
      ) : null}
      {backdateOpen && onBackdate ? (
        <QuestBackdateInline
          maxDate={todayDateIso}
          points={task.points}
          loading={backdating}
          onConfirm={(payload) => {
            onBackdate(payload);
            setBackdateOpen(false);
          }}
        />
      ) : null}
      {stepsTotal > 0 && stepsOpen ? (
        <ul className="border-t border-zinc-100 bg-zinc-50/60 px-3 py-2">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-2 py-1.5">
              <input
                type="checkbox"
                checked={step.is_completed}
                onChange={() => onToggleStep(step.id, !step.is_completed)}
                className="size-4 rounded border-zinc-400"
                aria-label={step.title}
              />
              <span
                className={`min-w-0 flex-1 text-sm ${
                  step.is_completed
                    ? "text-zinc-500 line-through"
                    : "text-zinc-900"
                }`}
              >
                {step.title}
              </span>
              <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-600">
                +{step.points}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TaskCardHeader({
  done,
  iconTint,
  Icon,
  task,
  isAnytime,
  claimCount,
  onToggle,
  onClaim,
  onUndoClaim,
  undoingClaim,
  onEdit,
  onDelete,
  stepsTotal,
  stepsDone,
  stepsOpen,
  onStepsToggle,
  weekStartForWeekly,
  scheduledDay,
  showWeekly,
  weeklyOpen,
  onWeeklyToggle,
  backdateOpen,
  onBackdateToggle,
  hasBackdate,
}: {
  done: boolean;
  iconTint: string;
  Icon: LucideIcon;
  task: TidyTask;
  isAnytime: boolean;
  claimCount: number;
  onToggle: () => void;
  onClaim?: () => void;
  onUndoClaim?: () => void;
  undoingClaim?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  stepsTotal: number;
  stepsDone: number;
  stepsOpen: boolean;
  onStepsToggle: () => void;
  weekStartForWeekly: string;
  scheduledDay?: DayKey | null;
  showWeekly: boolean;
  weeklyOpen: boolean;
  onWeeklyToggle: () => void;
  backdateOpen: boolean;
  onBackdateToggle: () => void;
  hasBackdate: boolean;
}) {
  const stepsBlockingClaim =
    isAnytime && stepsTotal > 0 && stepsDone < stepsTotal;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      {isAnytime ? (
        <div className="flex shrink-0 items-center gap-1">
          {claimCount > 0 && onUndoClaim ? (
            <button
              type="button"
              disabled={undoingClaim}
              onClick={onUndoClaim}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-semibold tabular-nums text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-40"
              aria-label={`Undo last claim for ${task.title}`}
            >
              {undoingClaim ? "…" : "−1"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={stepsBlockingClaim}
            onClick={onClaim}
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-zinc-900 transition hover:border-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Claim ${task.points} points for ${task.title}`}
          >
            +{task.points} pts
          </button>
        </div>
      ) : (
        <input
          type="checkbox"
          checked={done}
          onChange={onToggle}
          className="size-4 shrink-0 rounded border-zinc-400"
          aria-label={`Mark ${task.title} complete`}
        />
      )}
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconTint}`}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${
            done ? "text-zinc-500 line-through" : "text-zinc-900"
          }`}
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <p className="text-xs text-zinc-500">
            +{task.points} pts · {tidyRecurrenceLabel(task.recurrence)}
          </p>
          {isAnytime && claimCount > 0 ? (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium tabular-nums text-zinc-600">
              Completed {claimCount}×
            </span>
          ) : null}
          {scheduledDay ? (
            <WeeklyScheduleBadge
              scheduledDay={scheduledDay}
              weekStart={weekStartForWeekly}
            />
          ) : showWeekly ? (
            <SendToWeeklyToggle
              active={weeklyOpen}
              onToggle={onWeeklyToggle}
            />
          ) : null}
          {task.bundle_tag ? (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
              {task.bundle_tag}
            </span>
          ) : null}
          {stepsTotal > 0 ? (
            <button
              type="button"
              onClick={onStepsToggle}
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-zinc-700 underline-offset-2 hover:underline"
            >
              {stepsDone}/{stepsTotal} steps
              <ChevronDown
                className={`size-3 transition ${stepsOpen ? "rotate-180" : ""}`}
              />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        {hasBackdate ? (
          <button
            type="button"
            title="Log for past date"
            onClick={(e) => {
              e.stopPropagation();
              onBackdateToggle();
            }}
            className={`rounded-lg p-2 transition ${
              backdateOpen
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
            aria-label="Log points for a past date"
          >
            <CalendarPlus className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
          aria-label="Edit task"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-2 text-zinc-600 hover:bg-red-50 hover:text-red-700"
          aria-label="Delete task"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}