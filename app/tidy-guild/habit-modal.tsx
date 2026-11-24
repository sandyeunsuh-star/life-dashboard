"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  HABIT_DAILY_POINTS,
  HABIT_INCUBATOR_MAX,
  HABIT_TIER_OPTIONS,
  type HabitTier,
} from "@/lib/tidy/habit-constants";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  upsertTidyHabit,
  type UpsertTidyHabitInput,
} from "@/lib/supabase/queries/tidy-habits";
import type { TidyHabitRow } from "@/lib/supabase/types/tidy-habit";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";
import { SaveShortcutHint } from "@/lib/ui/save-shortcut-hint";
import {
  invokeFormSubmitHandler,
  useSaveKeyboardShortcut,
} from "@/lib/ui/use-save-keyboard-shortcut";

type HabitModalProps = {
  open: boolean;
  habit: TidyHabitRow | null;
  incubatingCount: number;
  onClose: () => void;
  onSaved: (habit: TidyHabitRow) => void;
};

export function HabitModal({
  open,
  habit,
  incubatingCount,
  onClose,
  onSaved,
}: HabitModalProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("");
  const [anchorCue, setAnchorCue] = useState("");
  const [tier, setTier] = useState<HabitTier>("simple");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (habit) {
      setTitle(habit.title);
      setAnchorCue(habit.anchor_cue ?? "");
      setTier(habit.tier);
    } else {
      setTitle("");
      setAnchorCue("");
      setTier("simple");
    }
    setError(null);
  }, [open, habit]);

  const atCap = !habit && incubatingCount >= HABIT_INCUBATOR_MAX;

  const handleSave = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!title.trim()) {
        setError("Habit name is required.");
        return;
      }
      if (atCap) {
        setError(
          `Focus on up to ${HABIT_INCUBATOR_MAX} incubating habits at a time.`,
        );
        return;
      }

      setLoading(true);
      setError(null);

      const input: UpsertTidyHabitInput = {
        id: habit?.id,
        title: title.trim(),
        anchor_cue: anchorCue.trim() || null,
        tier,
      };

      const supabase = createBrowserClientInstance();
      const { data, error: saveError } = await upsertTidyHabit(supabase, input);
      setLoading(false);

      if (saveError || !data) {
        setError(formatSupabaseError(saveError));
        return;
      }

      onSaved(data);
      onClose();
    },
    [title, anchorCue, tier, habit, atCap, onSaved, onClose],
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
      <HabitModalForm
        formRef={formRef}
        formId={formId}
        heading={habit ? "Edit habit" : "Incubate a habit"}
        atCap={atCap}
        title={title}
        onTitleChange={setTitle}
        anchorCue={anchorCue}
        onAnchorCueChange={setAnchorCue}
        tier={tier}
        onTierChange={setTier}
        error={error}
        loading={loading}
        incubatingCount={incubatingCount}
        onClose={onClose}
        onSubmit={handleSave}
      />
    </div>
  );
}

function HabitModalForm({
  formRef,
  formId,
  heading,
  atCap,
  title,
  onTitleChange,
  anchorCue,
  onAnchorCueChange,
  tier,
  onTierChange,
  error,
  loading,
  incubatingCount,
  onClose,
  onSubmit,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  formId: string;
  heading: string;
  atCap: boolean;
  title: string;
  onTitleChange: (v: string) => void;
  anchorCue: string;
  onAnchorCueChange: (v: string) => void;
  tier: HabitTier;
  onTierChange: (t: HabitTier) => void;
  error: string | null;
  loading: boolean;
  incubatingCount: number;
  onClose: () => void;
  onSubmit: (e?: React.FormEvent) => void;
}) {
  return (
    <form
      ref={formRef}
      id={formId}
      onSubmit={(e) => void onSubmit(e)}
      className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="text-base font-semibold text-zinc-900">{heading}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto px-4 py-4">
        <p className="text-xs text-zinc-600">
          Incubating{" "}
          <span className="font-semibold tabular-nums text-zinc-900">
            {incubatingCount} / {HABIT_INCUBATOR_MAX}
          </span>{" "}
          — keep the list small for focus.
        </p>

        <div>
          <label className={formLabelClass} htmlFor={`${formId}-title`}>
            Habit name
          </label>
          <input
            id={`${formId}-title`}
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="15-min evening tidy reset"
            className={formInputMdClass}
            autoFocus
          />
        </div>

        <div>
          <label className={formLabelClass} htmlFor={`${formId}-cue`}>
            Anchor cue{" "}
            <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id={`${formId}-cue`}
            type="text"
            value={anchorCue}
            onChange={(e) => onAnchorCueChange(e.target.value)}
            placeholder="After feeding the cat"
            className={formInputMdClass}
          />
        </div>

        <fieldset>
          <legend className={formLabelClass}>Habit complexity</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-1">
            {HABIT_TIER_OPTIONS.map((opt) => {
              const active = tier === opt.tier;
              return (
                <button
                  key={opt.tier}
                  type="button"
                  onClick={() => onTierChange(opt.tier)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <p className="text-sm font-semibold text-zinc-900">
                    {opt.title} · {opt.subtitle}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-600">{opt.blurb}</p>
                  <p className="mt-2 text-xs font-medium text-zinc-800">
                    +{HABIT_DAILY_POINTS} pts/day ·{" "}
                    <span className="tabular-nums">
                      +{opt.graduationPoints} pts
                    </span>{" "}
                    graduation
                  </p>
                </button>
              );
            })}
          </div>
        </fieldset>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {atCap ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            You already have {HABIT_INCUBATOR_MAX} habits incubating. Graduate
            or remove one before adding another.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3">
        <SaveShortcutHint />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || atCap}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {loading ? "Saving…" : "Save habit"}
          </button>
        </div>
      </div>
    </form>
  );
}