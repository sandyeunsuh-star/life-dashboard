"use client";

import { Pencil } from "lucide-react";
import { useCallback, useState } from "react";

import type { QuickCopySettings } from "@/lib/weekly/constants";

import { QuickCopyEditModal } from "./quick-copy-edit-modal";

type CopyKey = keyof QuickCopySettings;

const PILLS: { key: CopyKey; label: string }[] = [
  { key: "korean_address", label: "Korean Address" },
  { key: "english_address", label: "English Address" },
  { key: "customs_id", label: "Customs ID (P#)" },
];

type QuickCopyBarProps = {
  quickCopy: QuickCopySettings;
  onSave: (next: QuickCopySettings) => Promise<void>;
};

export function QuickCopyBar({ quickCopy, onSave }: QuickCopyBarProps) {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const copyValue = useCallback(async (label: string, value: string) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(null), 1600);
    } catch {
      setCopiedLabel("Copy failed");
      window.setTimeout(() => setCopiedLabel(null), 1600);
    }
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {PILLS.map(({ key, label }) => {
          const value = quickCopy[key];
          const disabled = !value.trim();
          const showCopied = copiedLabel === label;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => copyValue(label, value)}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {showCopied ? (
                <span className="text-emerald-700">Copied!</span>
              ) : (
                label
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="inline-flex size-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
          aria-label="Edit quick copy snippets"
        >
          <Pencil className="size-3.5" aria-hidden />
        </button>
      </div>

      <QuickCopyEditModal
        open={editOpen}
        quickCopy={quickCopy}
        onClose={() => setEditOpen(false)}
        onSave={async (next) => {
          await onSave(next);
          setEditOpen(false);
        }}
      />
    </>
  );
}