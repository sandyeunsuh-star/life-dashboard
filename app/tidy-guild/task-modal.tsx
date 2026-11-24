"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { BundleTagPicker } from "@/app/tidy-guild/bundle-tag-picker";
import { IconPicker } from "@/app/tidy-guild/icon-picker";
import { MicroStepsEditor } from "@/app/tidy-guild/micro-steps-editor";
import type { TidyIconKey, TidyRecurrence } from "@/lib/tidy/constants";
import { TIDY_POINT_PRESETS, TIDY_RECURRENCES } from "@/lib/tidy/constants";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { upsertTidyTask, type UpsertTidyTaskInput } from "@/lib/supabase/queries/tidy";
import { parseMicroSteps } from "@/lib/tidy/micro-steps";
import type { TidyMicroStep, TidyTask } from "@/lib/supabase/types/tidy";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";
import { SaveShortcutHint } from "@/lib/ui/save-shortcut-hint";
import {
  invokeFormSubmitHandler,
  useSaveKeyboardShortcut,
} from "@/lib/ui/use-save-keyboard-shortcut";

type TaskModalProps = {
  open: boolean;
  task: TidyTask | null;
  onClose: () => void;
  onSaved: (task: TidyTask) => void;
};

export function TaskModal({ open, task, onClose, onSaved }: TaskModalProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("");
  const [iconKey, setIconKey] = useState<TidyIconKey>("sparkles");
  const [points, setPoints] = useState(15);
  const [customPoints, setCustomPoints] = useState("");
  const [recurrence, setRecurrence] = useState<TidyRecurrence>("daily");
  const [microSteps, setMicroSteps] = useState<TidyMicroStep[]>([]);
  const [bundleTag, setBundleTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setIconKey(task.icon_key as TidyIconKey);
      setPoints(task.points);
      setCustomPoints(
        TIDY_POINT_PRESETS.includes(task.points as (typeof TIDY_POINT_PRESETS)[number])
          ? ""
          : String(task.points),
      );
      setRecurrence(task.recurrence);
      setMicroSteps(parseMicroSteps(task.micro_steps));
      setBundleTag(task.bundle_tag ?? "");
    } else {
      setTitle("");
      setIconKey("sparkles");
      setPoints(15);
      setCustomPoints("");
      setRecurrence("daily");
      setMicroSteps([]);
      setBundleTag("");
    }
    setError(null);
  }, [open, task]);

  const resolvedPoints =
    customPoints.trim() !== ""
      ? Math.max(1, Number.parseInt(customPoints, 10) || 1)
      : points;

  const handleSave = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!title.trim()) {
        setError("Task title is required.");
        return;
      }
      setLoading(true);
      setError(null);

      const input: UpsertTidyTaskInput = {
        id: task?.id,
        title: title.trim(),
        icon_key: iconKey,
        points: resolvedPoints,
        recurrence,
        micro_steps: microSteps
          .map((s) => ({ ...s, title: s.title.trim() }))
          .filter((s) => s.title),
        bundle_tag: bundleTag.trim() || null,
      };

      const supabase = createBrowserClientInstance();
      const { data, error: saveError } = await upsertTidyTask(supabase, input);
      setLoading(false);

      if (saveError || !data) {
        setError(formatSupabaseError(saveError));
        return;
      }

      onSaved(data);
      onClose();
    },
    [
      title,
      iconKey,
      resolvedPoints,
      recurrence,
      microSteps,
      bundleTag,
      task,
      onSaved,
      onClose,
    ],
  );

  const saveViaShortcut = useCallback(() => {
    invokeFormSubmitHandler(handleSave);
  }, [handleSave]);

  useSaveKeyboardShortcut(open, loading, saveViaShortcut);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40"
        aria-label="Close"
        onClick={onClose}
      />
      <TaskModalForm
        formRef={formRef}
        formId={formId}
        title={task ? "Edit task" : "New task"}
        onClose={onClose}
        error={error}
        loading={loading}
        onSubmit={handleSave}
        titleValue={title}
        onTitleChange={setTitle}
        iconKey={iconKey}
        onIconChange={setIconKey}
        points={points}
        onPointsChange={setPoints}
        customPoints={customPoints}
        onCustomPointsChange={setCustomPoints}
        recurrence={recurrence}
        onRecurrenceChange={setRecurrence}
        microSteps={microSteps}
        onMicroStepsChange={setMicroSteps}
        bundleTag={bundleTag}
        onBundleTagChange={setBundleTag}
      />
    </div>
  );
}

function TaskModalForm({
  formRef,
  formId,
  title: heading,
  onClose,
  error,
  loading,
  onSubmit,
  titleValue,
  onTitleChange,
  iconKey,
  onIconChange,
  points,
  onPointsChange,
  customPoints,
  onCustomPointsChange,
  recurrence,
  onRecurrenceChange,
  microSteps,
  onMicroStepsChange,
  bundleTag,
  onBundleTagChange,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  formId: string;
  title: string;
  onClose: () => void;
  error: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  titleValue: string;
  onTitleChange: (v: string) => void;
  iconKey: TidyIconKey;
  onIconChange: (k: TidyIconKey) => void;
  points: number;
  onPointsChange: (n: number) => void;
  customPoints: string;
  onCustomPointsChange: (v: string) => void;
  recurrence: TidyRecurrence;
  onRecurrenceChange: (r: TidyRecurrence) => void;
  microSteps: TidyMicroStep[];
  onMicroStepsChange: (steps: TidyMicroStep[]) => void;
  bundleTag: string;
  onBundleTagChange: (v: string) => void;
}) {
  return (
    <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">{heading}</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5">
          <X className="size-5 text-zinc-600" />
        </button>
      </div>

      <form
        ref={formRef}
        id={formId}
        onSubmit={onSubmit}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5"
      >
        <TaskModalFields
          titleValue={titleValue}
          onTitleChange={onTitleChange}
          iconKey={iconKey}
          onIconChange={onIconChange}
          points={points}
          onPointsChange={onPointsChange}
          customPoints={customPoints}
          onCustomPointsChange={onCustomPointsChange}
          recurrence={recurrence}
          onRecurrenceChange={onRecurrenceChange}
          microSteps={microSteps}
          onMicroStepsChange={onMicroStepsChange}
          bundleTag={bundleTag}
          onBundleTagChange={onBundleTagChange}
        />
        {error ? (
          <p className="mt-4 text-sm text-red-700">{error}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
          <SaveShortcutHint />
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save task"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TaskModalFields(props: {
  titleValue: string;
  onTitleChange: (v: string) => void;
  iconKey: TidyIconKey;
  onIconChange: (k: TidyIconKey) => void;
  points: number;
  onPointsChange: (n: number) => void;
  customPoints: string;
  onCustomPointsChange: (v: string) => void;
  recurrence: TidyRecurrence;
  onRecurrenceChange: (r: TidyRecurrence) => void;
  microSteps: TidyMicroStep[];
  onMicroStepsChange: (steps: TidyMicroStep[]) => void;
  bundleTag: string;
  onBundleTagChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tidy-task-title" className={formLabelClass}>
          Task title
        </label>
        <input
          id="tidy-task-title"
          value={props.titleValue}
          onChange={(e) => props.onTitleChange(e.target.value)}
          className={formInputMdClass}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={formLabelClass}>Icon</span>
        <IconPicker value={props.iconKey} onChange={props.onIconChange} />
      </div>

      <div className="flex flex-col gap-2">
        <span className={formLabelClass}>Points</span>
        <div className="flex flex-wrap gap-2">
          {TIDY_POINT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                props.onPointsChange(preset);
                props.onCustomPointsChange("");
              }}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                props.customPoints === "" && props.points === preset
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              +{preset}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          placeholder="Custom points"
          value={props.customPoints}
          onChange={(e) => props.onCustomPointsChange(e.target.value)}
          className={formInputMdClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tidy-recurrence" className={formLabelClass}>
          Recurrence
        </label>
        <select
          id="tidy-recurrence"
          value={props.recurrence}
          onChange={(e) =>
            props.onRecurrenceChange(e.target.value as TidyRecurrence)
          }
          className={formInputMdClass}
        >
          {TIDY_RECURRENCES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <BundleTagPicker
        value={props.bundleTag}
        onChange={props.onBundleTagChange}
      />

      <MicroStepsEditor
        steps={props.microSteps}
        onChange={props.onMicroStepsChange}
      />
    </div>
  );
}