"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SaveShortcutHint } from "@/lib/ui/save-shortcut-hint";
import { useSaveKeyboardShortcut } from "@/lib/ui/use-save-keyboard-shortcut";
import type { QuickCopySettings } from "@/lib/weekly/constants";

type QuickCopyEditModalProps = {
  open: boolean;
  quickCopy: QuickCopySettings;
  onClose: () => void;
  onSave: (next: QuickCopySettings) => Promise<void>;
};

export function QuickCopyEditModal({
  open,
  quickCopy,
  onClose,
  onSave,
}: QuickCopyEditModalProps) {
  const [draft, setDraft] = useState(quickCopy);
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (open) setDraft(quickCopy);
  }, [open, quickCopy]);

  const performSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(draftRef.current);
    } finally {
      setSaving(false);
    }
  }, [onSave, saving]);

  useSaveKeyboardShortcut(open, saving, () => {
    void performSave();
  });

  if (!open) return null;

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
        aria-labelledby="quick-copy-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
      >
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2
            id="quick-copy-title"
            className="text-sm font-semibold text-zinc-900"
          >
            Quick copy snippets
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Saved to your account. Values copy in full when you tap a pill.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Field
            label="Korean address"
            value={draft.korean_address}
            onChange={(v) => setDraft((d) => ({ ...d, korean_address: v }))}
          />
          <Field
            label="English address"
            value={draft.english_address}
            onChange={(v) => setDraft((d) => ({ ...d, english_address: v }))}
          />
          <Field
            label="Customs ID (P#)"
            value={draft.customs_id}
            onChange={(v) => setDraft((d) => ({ ...d, customs_id: v }))}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-4">
          <SaveShortcutHint />
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
            onClick={() => void performSave()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="mb-4 block last:mb-0">
      <span className="mb-1 block text-xs font-medium text-zinc-600">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900/10 focus:ring-2"
      />
    </label>
  );
}
