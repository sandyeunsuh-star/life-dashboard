"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import {
  TIDY_MICRO_STEP_DEFAULT_POINTS,
} from "@/lib/tidy/constants";
import { newMicroStepId } from "@/lib/tidy/micro-steps";
import type { TidyMicroStep } from "@/lib/supabase/types/tidy";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

type MicroStepsEditorProps = {
  steps: TidyMicroStep[];
  onChange: (steps: TidyMicroStep[]) => void;
};

export function MicroStepsEditor({ steps, onChange }: MicroStepsEditorProps) {
  function addStep() {
    onChange([
      ...steps,
      {
        id: newMicroStepId(),
        title: "",
        points: TIDY_MICRO_STEP_DEFAULT_POINTS,
        is_completed: false,
      },
    ]);
  }

  function updateStep(id: string, patch: Partial<TidyMicroStep>) {
    onChange(
      steps.map((s) => (s.id === id ? { ...s, ...patch, id: s.id } : s)),
    );
  }

  function removeStep(id: string) {
    onChange(steps.filter((s) => s.id !== id));
  }

  function moveStep(id: string, dir: -1 | 1) {
    const index = steps.findIndex((s) => s.id === id);
    if (index < 0) return;
    const next = index + dir;
    if (next < 0 || next >= steps.length) return;
    const copy = [...steps];
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row!);
    onChange(copy);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className={formLabelClass}>Stepping stones</span>
        <button
          type="button"
          onClick={addStep}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-300 px-2 text-xs font-medium text-zinc-900"
        >
          <Plus className="size-3.5" />
          Add step
        </button>
      </div>
      {steps.length === 0 ? (
        <p className="text-xs text-zinc-500">
          Break big tasks into tiny +2 pt wins.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-2"
            >
              <div className="flex gap-2">
                <input
                  value={step.title}
                  onChange={(e) =>
                    updateStep(step.id, { title: e.target.value })
                  }
                  placeholder="Micro-step title"
                  className={`${formInputMdClass} min-w-0 flex-1`}
                />
                <input
                  type="number"
                  min={1}
                  value={step.points}
                  onChange={(e) =>
                    updateStep(step.id, {
                      points: Math.max(
                        1,
                        Number.parseInt(e.target.value, 10) ||
                          TIDY_MICRO_STEP_DEFAULT_POINTS,
                      ),
                    })
                  }
                  className={`${formInputMdClass} w-16 shrink-0 text-center`}
                  aria-label="Step points"
                />
              </div>
              <div className="mt-2 flex items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveStep(step.id, -1)}
                  className="rounded-md border border-zinc-300 p-1 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === steps.length - 1}
                  onClick={() => moveStep(step.id, 1)}
                  className="rounded-md border border-zinc-300 p-1 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeStep(step.id)}
                  className="ml-auto rounded-md border border-zinc-300 p-1 text-zinc-600 hover:text-red-600"
                  aria-label="Remove step"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}