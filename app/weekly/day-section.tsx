"use client";

import { ArrowRight } from "lucide-react";
import { useCallback, useRef } from "react";

import {
  WeeklyAnytimeClaimBadge,
  WeeklyTaskPointsBadge,
  WeeklyTaskPointsPicker,
} from "@/app/weekly/weekly-task-points";
import { weeklyTaskPoints } from "@/lib/weekly/task-points";
import {
  DAY_LABELS,
  type DayKey,
  type WeeklyDays,
  type WeeklyTask,
} from "@/lib/weekly/constants";
import { formatWeekDayDate } from "@/lib/weekly/dates";
import type { TidyTask } from "@/lib/supabase/types/tidy";

type DaySectionProps = {
  day: DayKey;
  weekStart: string;
  isToday: boolean;
  tasks: WeeklyTask[];
  tidyTasksById: Record<string, TidyTask>;
  onChange: (nextTasks: WeeklyTask[]) => void;
  onToggleTask: (task: WeeklyTask, checked: boolean) => Promise<void>;
  onAnytimeClaim: (task: WeeklyTask) => Promise<void>;
  onMoveToTomorrow: (taskId: string) => void;
  canMoveToTomorrow: boolean;
};

export function DaySection({
  day,
  weekStart,
  isToday,
  tasks,
  tidyTasksById,
  onChange,
  onToggleTask,
  onAnytimeClaim,
  onMoveToTomorrow,
  canMoveToTomorrow,
}: DaySectionProps) {
  const addInputRef = useRef<HTMLInputElement>(null);

  const updateTask = useCallback(
    (id: string, patch: Partial<WeeklyTask>) => {
      onChange(
        tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
    },
    [onChange, tasks],
  );

  const removeTask = useCallback(
    (id: string) => {
      onChange(tasks.filter((t) => t.id !== id));
    },
    [onChange, tasks],
  );

  const insertAfter = useCallback(
    (afterId: string | null, text = "") => {
      const newTask: WeeklyTask = {
        id: crypto.randomUUID(),
        text,
        checked: false,
        points: 0,
      };
      if (!afterId) {
        onChange([...tasks, newTask]);
        return newTask.id;
      }
      const idx = tasks.findIndex((t) => t.id === afterId);
      if (idx < 0) {
        onChange([...tasks, newTask]);
        return newTask.id;
      }
      const next = [...tasks];
      next.splice(idx + 1, 0, newTask);
      onChange(next);
      return newTask.id;
    },
    [onChange, tasks],
  );

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = addInputRef.current;
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    onChange([
      ...tasks,
      { id: crypto.randomUUID(), text, checked: false, points: 0 },
    ]);
    input.value = "";
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-xs font-semibold tracking-widest text-zinc-500">
          {DAY_LABELS[day]} {formatWeekDayDate(weekStart, day)}
        </h3>
        {isToday ? (
          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Today
          </span>
        ) : null}
      </div>

      <ul className="space-y-1">
        {tasks.map((task) => {
          const tidy = task.tidy_task_id
            ? tidyTasksById[task.tidy_task_id]
            : undefined;
          const isAnytimeLinked = tidy?.recurrence === "anytime";
          return (
            <TaskRow
              key={task.id}
              task={task}
              points={weeklyTaskPoints(task)}
              isAnytimeLinked={isAnytimeLinked}
              onToggle={(checked) => void onToggleTask(task, checked)}
              onAnytimeClaim={
                isAnytimeLinked
                  ? () => void onAnytimeClaim(task)
                  : undefined
              }
              onTextChange={(text) => updateTask(task.id, { text })}
              onPointsChange={(points) =>
                updateTask(task.id, {
                  points: points > 0 ? points : undefined,
                })
              }
              onRemove={() => removeTask(task.id)}
              onEnterBelow={() => insertAfter(task.id, "")}
              onBackspaceEmpty={() => removeTask(task.id)}
              onMoveToTomorrow={
                canMoveToTomorrow && !task.checked
                  ? () => onMoveToTomorrow(task.id)
                  : undefined
              }
            />
          );
        })}
      </ul>

      <form onSubmit={handleAddSubmit} className="mt-2">
        <input
          ref={addInputRef}
          type="text"
          placeholder="Add task…"
          className="w-full border-0 bg-transparent py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none"
        />
      </form>
    </section>
  );
}

type TaskRowProps = {
  task: WeeklyTask;
  points: number;
  isAnytimeLinked: boolean;
  onToggle: (checked: boolean) => void;
  onAnytimeClaim?: () => void;
  onTextChange: (text: string) => void;
  onPointsChange: (points: number) => void;
  onRemove: () => void;
  onEnterBelow: () => string;
  onBackspaceEmpty: () => void;
  onMoveToTomorrow?: () => void;
};

function TaskRow({
  task,
  points,
  isAnytimeLinked,
  onToggle,
  onAnytimeClaim,
  onTextChange,
  onPointsChange,
  onRemove,
  onEnterBelow,
  onBackspaceEmpty,
  onMoveToTomorrow,
}: TaskRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const claimCount = task.anytime_claim_count ?? 0;
  const showPointsBadge = points > 0 && !isAnytimeLinked;

  return (
    <li className="group flex items-start gap-2 rounded-lg px-1 py-0.5 hover:bg-zinc-50/80">
      {isAnytimeLinked ? (
        <button
          type="button"
          onClick={onAnytimeClaim}
          className="mt-1 shrink-0 rounded-md border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-900 hover:bg-white"
          title="Claim another"
        >
          +1
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onToggle(!task.checked)}
          className={`mt-1.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition ${task.checked ? "border-zinc-900 bg-zinc-900" : "border-zinc-300 bg-white hover:border-zinc-400"}`}
          aria-label={task.checked ? "Mark incomplete" : "Mark complete"}
        >
          {task.checked ? (
            <span className="size-1.5 rounded-full bg-white" />
          ) : null}
        </button>
      )}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={task.text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const newId = onEnterBelow();
              window.requestAnimationFrame(() => {
                const row = document.querySelector<HTMLInputElement>(
                  `[data-task-id="${newId}"]`,
                );
                row?.focus();
              });
            } else if (
              e.key === "Backspace" &&
              task.text === "" &&
              !task.checked
            ) {
              e.preventDefault();
              onRemove();
            }
          }}
          data-task-id={task.id}
          className={`min-w-0 flex-1 border-0 bg-transparent py-1 text-sm text-zinc-900 outline-none ${task.checked ? "text-zinc-400 line-through" : ""}`}
        />
        {showPointsBadge ? <WeeklyTaskPointsBadge points={points} /> : null}
        {isAnytimeLinked ? (
          <>
            <WeeklyTaskPointsBadge points={points} />
            <WeeklyAnytimeClaimBadge count={claimCount} />
          </>
        ) : null}
        {!task.tidy_task_id ? (
          <WeeklyTaskPointsPicker
            value={points}
            onChange={onPointsChange}
          />
        ) : null}
      </div>
      {onMoveToTomorrow ? (
        <button
          type="button"
          onClick={onMoveToTomorrow}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-zinc-500 opacity-0 transition hover:bg-white hover:text-zinc-900 group-hover:opacity-100"
        >
          Move to tomorrow
          <ArrowRight className="size-3" aria-hidden />
        </button>
      ) : null}
    </li>
  );
}

export type { WeeklyDays };