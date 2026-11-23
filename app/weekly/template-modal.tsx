"use client";

import { useEffect, useState } from "react";

import {
  DAY_KEYS,
  DAY_LABELS,
  type DayKey,
  type RecurringTemplate,
} from "@/lib/weekly/constants";

type TemplateModalProps = {
  open: boolean;
  template: RecurringTemplate;
  onClose: () => void;
  onSave: (next: RecurringTemplate) => Promise<void>;
};

export function TemplateModal({
  open,
  template,
  onClose,
  onSave,
}: TemplateModalProps) {
  const [draft, setDraft] = useState(template);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft(template);
  }, [open, template]);

  if (!open) return null;

  function linesFor(day: DayKey) {
    return (draft[day] ?? []).join("\n");
  }

  function setLines(day: DayKey, text: string) {
    setDraft((d) => ({
      ...d,
      [day]: text.split("\n"),
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/20"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="template-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
      >
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2
            id="template-title"
            className="text-sm font-semibold text-zinc-900"
          >
            Weekly template
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            One task per line. Used when you start a new week (Mon–Sun).
          </p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {DAY_KEYS.map((day) => (
            <label key={day} className="block">
              <span className="mb-1 block text-xs font-semibold tracking-wide text-zinc-500">
                {DAY_LABELS[day]}
              </span>
              <textarea
                value={linesFor(day)}
                onChange={(e) => setLines(day, e.target.value)}
                rows={day === "saturday" || day === "sunday" ? 2 : 3}
                className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 outline-none ring-zinc-900/10 focus:ring-2"
                placeholder="Add tasks…"
              />
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(draft);
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>
    </div>
  );
}