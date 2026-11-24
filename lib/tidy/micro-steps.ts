import type { TidyRecurrence } from "@/lib/tidy/constants";
import { isTaskEffectivelyComplete } from "@/lib/tidy/task-reset";
import type { TidyMicroStep, TidyTask } from "@/lib/supabase/types/tidy";

export function parseMicroSteps(raw: unknown): TidyMicroStep[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : "";
      const title = typeof record.title === "string" ? record.title.trim() : "";
      const points =
        typeof record.points === "number" && record.points > 0
          ? record.points
          : 2;
      const is_completed = record.is_completed === true;
      if (!id || !title) return null;
      return { id, title, points, is_completed };
    })
    .filter((s): s is TidyMicroStep => s !== null);
}

export function newMicroStepId(): string {
  return crypto.randomUUID();
}

/** Steps shown in UI — reset completions when the parent task period has elapsed. */
export function displayMicroSteps(task: TidyTask, now = new Date()): TidyMicroStep[] {
  const steps = task.micro_steps ?? [];
  if (steps.length === 0) {
    return [];
  }

  const parentDone = isTaskEffectivelyComplete(
    task.recurrence,
    task.completed_at,
    now,
  );

  if (
    task.recurrence === "one_off" ||
    task.recurrence === "anytime" ||
    task.recurrence === "side_quests"
  ) {
    return steps;
  }

  if (!parentDone && steps.some((s) => s.is_completed)) {
    return steps.map((s) => ({ ...s, is_completed: false }));
  }

  return steps;
}

export function microStepProgress(steps: TidyMicroStep[]): {
  done: number;
  total: number;
} {
  const total = steps.length;
  const done = steps.filter((s) => s.is_completed).length;
  return { done, total };
}

export function allMicroStepsComplete(steps: TidyMicroStep[]): boolean {
  return steps.length > 0 && steps.every((s) => s.is_completed);
}

export function taskNeedsPeriodReset(task: TidyTask, now = new Date()): boolean {
  if (
    task.recurrence === "one_off" ||
    task.recurrence === "anytime" ||
    task.recurrence === "side_quests"
  ) {
    return false;
  }
  const steps = task.micro_steps ?? [];
  if (steps.length === 0) {
    return false;
  }
  if (isTaskEffectivelyComplete(task.recurrence, task.completed_at, now)) {
    return false;
  }
  return steps.some((s) => s.is_completed);
}

export function resetMicroStepsForStorage(
  steps: TidyMicroStep[],
): TidyMicroStep[] {
  return steps.map((s) => ({ ...s, is_completed: false }));
}

export function quickWinTaskMatch(
  task: TidyTask,
  quickWinsOnly: boolean,
  now = new Date(),
): boolean {
  if (!quickWinsOnly) {
    return true;
  }

  const steps = displayMicroSteps(task, now);
  if (steps.length > 0) {
    const hasOpenStep = steps.some((s) => !s.is_completed);
    if (hasOpenStep) {
      return true;
    }
  }

  const stepPointTotal = steps.reduce((sum, s) => sum + s.points, 0);
  const mainPoints = task.points;
  if (steps.length > 0) {
    return stepPointTotal <= 5 || mainPoints <= 5;
  }

  return mainPoints <= 5;
}