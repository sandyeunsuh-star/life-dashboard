"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import {
  CurrentsPaperModal,
  CurrentsPaperSwatchSm,
} from "@/app/currents/currents-paper-modal";
import { CurrentsPhotoStrip } from "@/app/currents/currents-photo-strip";
import {
  CURRENTS_PROMPTS,
  emptyCurrentsPrompts,
  type CurrentsPromptsMap,
} from "@/lib/currents/constants";
import {
  CURRENTS_PAPER_OVERLAY_DEFAULT,
  currentsSpreadMatClass,
  type CurrentsPaperOverlay,
} from "@/lib/currents/paper-overlay";
import {
  currentsPaperThumbForEntry,
  resolveCurrentsSpreadPaperUrl,
} from "@/lib/currents/resolve-paper-image-url";
import { formatCurrentsRecordedAt } from "@/lib/currents/format-recorded-at";
import { periodLabelFromYm } from "@/lib/currents/period";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { upsertCurrentsEntry } from "@/lib/supabase/queries/currents";
import { uploadCurrentsImageFromFile } from "@/lib/supabase/storage/currents-images";
import type { CurrentsEntryRow } from "@/lib/supabase/types/currents";
import type { CurrentsDigitalPaper } from "@/lib/supabase/types/currents-paper";
import { SaveShortcutHint } from "@/lib/ui/save-shortcut-hint";
import {
  invokeFormSubmitHandler,
  useSaveKeyboardShortcut,
} from "@/lib/ui/use-save-keyboard-shortcut";
import { requireAuthUser } from "@/lib/supabase/require-auth-user";

const LIGHT_SHEET_CLASS =
  "rounded-2xl border border-stone-200/90 bg-[#FCFBF9] text-zinc-900 shadow-sm";

type CurrentsEditorProps = {
  entry: CurrentsEntryRow | null;
  periodYm: string;
  digitalPapers: CurrentsDigitalPaper[];
  onSaved: (row: CurrentsEntryRow) => void;
  onDeleted?: (id: string) => void;
  onCancelDraft?: () => void;
  onToast?: (message: string) => void;
};

export function CurrentsEditor({
  entry,
  periodYm,
  digitalPapers,
  onSaved,
  onDeleted,
  onCancelDraft,
  onToast,
}: CurrentsEditorProps) {
  const formId = useId();
  const isDraft = !entry?.id;
  const [periodLabel, setPeriodLabel] = useState(
    entry?.period_label ?? periodLabelFromYm(periodYm),
  );
  const [entryTitle, setEntryTitle] = useState(entry?.entry_title ?? "");
  const [moodNote, setMoodNote] = useState(entry?.mood_note ?? "");
  const [prompts, setPrompts] = useState<CurrentsPromptsMap>(() => {
    const base = emptyCurrentsPrompts();
    if (!entry?.prompts) return base;
    for (const key of Object.keys(base) as (keyof CurrentsPromptsMap)[]) {
      base[key] = entry.prompts[key] ?? "";
    }
    return base;
  });
  const [photoUrls, setPhotoUrls] = useState<string[]>(entry?.photo_urls ?? []);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [paperItemId, setPaperItemId] = useState<string | null>(
    entry?.paper_item_id ?? null,
  );
  const [paperImageUrl, setPaperImageUrl] = useState<string | null>(
    entry?.paper_image_url ?? null,
  );
  const [paperTitle, setPaperTitle] = useState<string | null>(
    entry?.paper_title ?? null,
  );
  const [paperOverlay, setPaperOverlay] = useState<CurrentsPaperOverlay>(
    entry?.paper_overlay ?? CURRENTS_PAPER_OVERLAY_DEFAULT,
  );
  const [paperModalOpen, setPaperModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPeriodLabel(entry?.period_label ?? periodLabelFromYm(periodYm));
    setEntryTitle(entry?.entry_title ?? "");
    setMoodNote(entry?.mood_note ?? "");
    const base = emptyCurrentsPrompts();
    if (entry?.prompts) {
      for (const key of Object.keys(base) as (keyof CurrentsPromptsMap)[]) {
        base[key] = entry.prompts[key] ?? "";
      }
    }
    setPrompts(base);
    setPhotoUrls(entry?.photo_urls ?? []);
    setPendingFiles([]);
    setPaperItemId(entry?.paper_item_id ?? null);
    setPaperImageUrl(entry?.paper_image_url ?? null);
    setPaperTitle(entry?.paper_title ?? null);
    setPaperOverlay(entry?.paper_overlay ?? CURRENTS_PAPER_OVERLAY_DEFAULT);
    setError(null);
  }, [entry, periodYm]);

  const spreadPaperUrl = useMemo(
    () =>
      resolveCurrentsSpreadPaperUrl(
        paperItemId,
        paperImageUrl,
        digitalPapers,
      ),
    [digitalPapers, paperImageUrl, paperItemId],
  );

  const headerPaperThumbUrl = useMemo(
    () =>
      currentsPaperThumbForEntry(paperItemId, paperImageUrl, digitalPapers),
    [digitalPapers, paperImageUrl, paperItemId],
  );

  const hasPaper = Boolean(spreadPaperUrl?.trim());
  const moodyMat = hasPaper && paperOverlay === "moody";

  const labelClass =
    "text-[10px] font-medium tracking-[0.2em] text-stone-500 uppercase";

  const fieldLabelClass = moodyMat
    ? "text-[10px] font-medium tracking-[0.2em] text-stone-400 uppercase"
    : labelClass;

  const inputClass = moodyMat
    ? "w-full rounded-lg border border-stone-600 bg-zinc-800/80 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
    : "w-full rounded-lg border border-stone-200 bg-white/90 px-3 py-2 text-sm text-zinc-900 placeholder:text-stone-400";

  const textareaClass = `${inputClass} min-h-[4.5rem] resize-y`;

  const overlayBadge =
    paperOverlay === "moody" ? "Moody ink" : "Light vellum";

  const applyPaper = useCallback(
    (paper: CurrentsDigitalPaper | null, overlay: CurrentsPaperOverlay) => {
      if (!paper) {
        setPaperItemId(null);
        setPaperImageUrl(null);
        setPaperTitle(null);
        setPaperOverlay(CURRENTS_PAPER_OVERLAY_DEFAULT);
        return;
      }
      setPaperItemId(paper.itemId);
      setPaperImageUrl(paper.fullUrl);
      setPaperTitle(paper.title);
      setPaperOverlay(overlay);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createBrowserClientInstance();
    const auth = await requireAuthUser(supabase);
    if (auth.error || !auth.user) {
      setLoading(false);
      setError("Not signed in");
      return;
    }

    let urls = [...photoUrls];
    for (const file of pendingFiles) {
      const { publicUrl, error: upErr } = await uploadCurrentsImageFromFile(
        supabase,
        auth.user.id,
        file,
        entry?.id,
      );
      if (upErr || !publicUrl) {
        setLoading(false);
        setError(formatSupabaseError(upErr) || "Photo upload failed");
        return;
      }
      urls.push(publicUrl);
    }
    urls = urls.slice(0, 4);

    const resolvedPaperUrl = resolveCurrentsSpreadPaperUrl(
      paperItemId,
      paperImageUrl,
      digitalPapers,
    );

    const { data, error: saveError } = await upsertCurrentsEntry(supabase, {
      id: entry?.id,
      period_ym: periodYm,
      period_label: periodLabel,
      entry_title: entryTitle,
      mood_note: moodNote,
      prompts,
      photo_urls: urls,
      paper_item_id: paperItemId,
      paper_image_url: resolvedPaperUrl,
      paper_title: paperTitle,
      paper_overlay: resolvedPaperUrl ? paperOverlay : null,
    });
    setLoading(false);
    if (saveError || !data) {
      setError(formatSupabaseError(saveError) || "Could not save");
      return;
    }
    onSaved(data);
    setPendingFiles([]);
    setPhotoUrls(data.photo_urls);
    onToast?.(`Saved · ${data.period_label}`);
  }, [
    entry?.id,
    moodNote,
    onSaved,
    onToast,
    paperImageUrl,
    paperItemId,
    paperOverlay,
    paperTitle,
    digitalPapers,
    pendingFiles,
    entryTitle,
    periodLabel,
    periodYm,
    photoUrls,
    prompts,
  ]);

  const handleDelete = useCallback(async () => {
    if (!entry?.id || !onDeleted) return;
    onDeleted(entry.id);
  }, [entry?.id, onDeleted]);

  const saveViaShortcut = useCallback(() => {
    invokeFormSubmitHandler(() => void handleSave());
  }, [handleSave]);

  useSaveKeyboardShortcut(!paperModalOpen, loading, saveViaShortcut);

  const hasContent = useMemo(
    () =>
      Object.values(prompts).some((v) => v.trim()) ||
      moodNote.trim() ||
      photoUrls.length > 0 ||
      pendingFiles.length > 0 ||
      hasPaper,
    [hasPaper, moodNote, pendingFiles.length, photoUrls.length, prompts],
  );

  const recordedDisplay = entry?.recorded_at
    ? formatCurrentsRecordedAt(entry.recorded_at)
    : formatCurrentsRecordedAt(new Date().toISOString());

  const formBody = (
    <>
      <header className="mb-6 border-b border-stone-200/50 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={fieldLabelClass}>Currents · Spread</p>
          <p
            className={`text-xs ${moodyMat ? "text-stone-400" : "text-stone-500"}`}
          >
            {isDraft ? "Recording today" : recordedDisplay}
          </p>
        </div>
        <input
          value={periodLabel}
          onChange={(e) => setPeriodLabel(e.target.value)}
          className={`mt-2 w-full bg-transparent font-serif text-2xl font-medium tracking-tight text-zinc-900 sm:text-3xl ${
            moodyMat ? "text-stone-50" : ""
          }`}
          aria-label="Period label"
        />
        <input
          value={entryTitle}
          onChange={(e) => setEntryTitle(e.target.value)}
          placeholder='Subtitle — e.g. "Vol. 2" or "Rainy week"'
          className={`mt-1 w-full bg-transparent font-serif text-lg italic ${
            moodyMat ? "text-stone-300 placeholder:text-stone-600" : "text-stone-600 placeholder:text-stone-400"
          }`}
          aria-label="Entry subtitle"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-stone-200/80 bg-white/60 px-3 py-2.5">
          <span className={labelClass}>Paper background</span>
          <CurrentsPaperSwatchSm
            label={paperTitle ?? "None"}
            imageUrl={headerPaperThumbUrl ?? undefined}
            selected={false}
            onClick={() => setPaperModalOpen(true)}
            size="sm"
          />
          {hasPaper ? (
            <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-stone-600">
              {overlayBadge}
            </span>
          ) : (
            <span className="text-xs text-stone-500">None</span>
          )}
          <button
            type="button"
            onClick={() => setPaperModalOpen(true)}
            className="ml-auto rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-stone-50"
          >
            Change paper
          </button>
        </div>

        <div className="mt-4">
          <label className={fieldLabelClass} htmlFor={`${formId}-mood`}>
            Mood / atmosphere
          </label>
          <textarea
            id={`${formId}-mood`}
            value={moodNote}
            onChange={(e) => setMoodNote(e.target.value)}
            placeholder="Rainy evenings, chamomile tea, and chunky cables…"
            className={`${textareaClass} mt-1`}
            rows={2}
          />
        </div>
      </header>

      <PromptGrid
        prompts={prompts}
        setPrompts={setPrompts}
        labelClass={fieldLabelClass}
        textareaClass={textareaClass}
      />

      <div className="mt-6">
        <CurrentsPhotoStrip
          active
          photoUrls={photoUrls}
          pendingFiles={pendingFiles}
          onPhotoUrlsChange={setPhotoUrls}
          onPendingFilesChange={setPendingFiles}
        />
      </div>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/50 pt-4">
        <SaveShortcutHint />
        <div className="flex flex-wrap items-center gap-2">
          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : !hasContent ? (
            <p className="text-xs text-stone-500">Blank pages are welcome.</p>
          ) : null}
          {isDraft && onCancelDraft ? (
            <button
              type="button"
              onClick={onCancelDraft}
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
          ) : null}
          {entry?.id && onDeleted ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40 ${
              moodyMat
                ? "bg-stone-100 text-zinc-900 hover:bg-white"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            {loading ? "Saving…" : isDraft ? "Save entry" : "Save changes"}
          </button>
        </div>
      </footer>
    </>
  );

  return (
    <>
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
        className={
          hasPaper
            ? "relative overflow-hidden rounded-2xl border border-stone-200/90 shadow-sm"
            : LIGHT_SHEET_CLASS
        }
      >
        {hasPaper && spreadPaperUrl ? (
          <>
            <div className="pointer-events-none absolute inset-0">
              <Image
                src={spreadPaperUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1024px"
                loading="lazy"
                unoptimized
              />
            </div>
            <div className="relative p-2 sm:p-3">
              <div
                className={`rounded-xl ${currentsSpreadMatClass(paperOverlay)} p-5 sm:p-7`}
              >
                {formBody}
              </div>
            </div>
            {paperTitle ? (
              <p
                className={`relative px-4 pb-3 text-[10px] font-medium tracking-[0.16em] uppercase drop-shadow-sm ${
                  paperOverlay === "moody"
                    ? "text-stone-100"
                    : "text-stone-800/95"
                }`}
              >
                PAPER · {paperTitle}
              </p>
            ) : null}
          </>
        ) : (
          <div className="p-5 sm:p-7">{formBody}</div>
        )}
      </form>

      <CurrentsPaperModal
        open={paperModalOpen}
        papers={digitalPapers}
        selectedItemId={paperItemId}
        overlay={paperOverlay}
        onClose={() => setPaperModalOpen(false)}
        onApply={applyPaper}
      />
    </>
  );
}

function PromptGrid({
  prompts,
  setPrompts,
  labelClass,
  textareaClass,
}: {
  prompts: CurrentsPromptsMap;
  setPrompts: (p: CurrentsPromptsMap) => void;
  labelClass: string;
  textareaClass: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {CURRENTS_PROMPTS.map(({ key, label }) => (
        <PromptField
          key={key}
          label={label}
          labelClass={labelClass}
          value={prompts[key]}
          onChange={(v) => setPrompts({ ...prompts, [key]: v })}
          textareaClass={textareaClass}
        />
      ))}
    </div>
  );
}

function PromptField({
  label,
  labelClass,
  value,
  onChange,
  textareaClass,
}: {
  label: string;
  labelClass: string;
  value: string;
  onChange: (v: string) => void;
  textareaClass: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${textareaClass} mt-1.5`}
        rows={3}
      />
    </label>
  );
}