"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { CurrentsEditor } from "@/app/currents/currents-editor";
import { formatCurrentsRecordedAt } from "@/lib/currents/format-recorded-at";
import type { CurrentsEntryRow } from "@/lib/supabase/types/currents";
import type { CurrentsDigitalPaper } from "@/lib/supabase/types/currents-paper";

type CurrentsEntryCardProps = {
  entry: CurrentsEntryRow | null;
  periodYm: string;
  digitalPapers: CurrentsDigitalPaper[];
  defaultExpanded?: boolean;
  onSaved: (row: CurrentsEntryRow) => void;
  onDeleted?: (id: string) => void;
  onCancelDraft?: () => void;
  onToast?: (message: string) => void;
};

export function CurrentsEntryCard({
  entry,
  periodYm,
  digitalPapers,
  defaultExpanded = false,
  onSaved,
  onDeleted,
  onCancelDraft,
  onToast,
}: CurrentsEntryCardProps) {
  const isDraft = !entry?.id;
  const [expanded, setExpanded] = useState(defaultExpanded || isDraft);

  const recordedLabel = entry?.recorded_at
    ? formatCurrentsRecordedAt(entry.recorded_at)
    : formatCurrentsRecordedAt(new Date().toISOString());

  const titleLine = [
    entry?.period_label,
    entry?.entry_title?.trim() || null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!expanded && entry) {
    return (
      <article className="rounded-2xl border border-stone-200/90 bg-[#FCFBF9] px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-medium tracking-[0.2em] text-stone-500 uppercase">
              {recordedLabel}
            </p>
            <h3 className="font-serif text-lg font-medium text-zinc-900">
              {titleLine || "Untitled spread"}
            </h3>
            {entry.mood_note?.trim() ? (
              <p className="line-clamp-2 text-sm text-stone-600">
                {entry.mood_note}
              </p>
            ) : null}
            {entry.paper_title ? (
              <p className="text-[10px] font-medium tracking-[0.12em] text-stone-500 uppercase">
                Paper · {entry.paper_title}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-stone-50"
            >
              <Pencil className="size-3.5" aria-hidden />
              Edit
            </button>
            {onDeleted ? (
              <button
                type="button"
                onClick={() => entry.id && onDeleted(entry.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-2">
      {!isDraft && entry ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-[10px] font-medium tracking-[0.2em] text-stone-500 uppercase">
            {recordedLabel}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              Collapse
            </button>
          </div>
        </div>
      ) : null}

      <CurrentsEditor
        entry={entry}
        periodYm={periodYm}
        digitalPapers={digitalPapers}
        onSaved={(row) => {
          onSaved(row);
          if (isDraft) {
            setExpanded(false);
          }
        }}
        onDeleted={entry?.id ? onDeleted : undefined}
        onCancelDraft={isDraft ? onCancelDraft : undefined}
        onToast={onToast}
      />
    </div>
  );
}