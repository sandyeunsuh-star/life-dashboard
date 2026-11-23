"use client";

import { FileText, ImageIcon, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { FabricTypePicker } from "@/app/sewing/fabric-type-picker";
import {
  SEWING_STATUSES,
  sewingCategorySelectOptions,
  type SewingStatus,
} from "@/lib/sewing/constants";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { compressToWebpCover } from "@/lib/supabase/images/compress-cover";
import {
  createSewingPattern,
  deleteSewingPattern,
  moveSewingPatternToLibrary,
  updateSewingPattern,
} from "@/lib/supabase/queries/sewing-patterns";
import {
  removePatternCover,
  resolveSewingCoverUrl,
  sewingCoverStoragePath,
  uploadPatternCover,
} from "@/lib/supabase/storage/pattern-covers";
import {
  createSewingSignedUrl,
  removeSewingObject,
  sewingInstructionsPdfPath,
  sewingPatternPdfPath,
  uploadSewingObject,
} from "@/lib/supabase/storage/sewing-patterns";
import type { SewingPatternRow } from "@/lib/supabase/types/sewing-pattern";
import {
  formInputMdClass,
  formLabelClass,
  formTextareaClass,
} from "@/lib/ui/form-styles";
import { SaveShortcutHint } from "@/lib/ui/save-shortcut-hint";
import {
  invokeFormSubmitHandler,
  useSaveKeyboardShortcut,
} from "@/lib/ui/use-save-keyboard-shortcut";

type SewingPatternModalProps = {
  open: boolean;
  pattern: SewingPatternRow | null;
  defaultIsWishlist?: boolean;
  designerSuggestions: string[];
  onClose: () => void;
  onSaved: (pattern: SewingPatternRow) => void;
  onDeleted?: (id: string) => void;
};

type FormState = {
  title: string;
  designer: string;
  category: string;
  status: SewingStatus;
  fabric_type: string;
  fabric_recs: string;
  yardage: string;
  notions: string;
  size_info: string;
  purchase_url: string;
  is_wishlist: boolean;
  notes: string;
  cover_path: string | null;
  instructions_pdf_path: string | null;
  instructions_drive_url: string;
  pattern_pdf_path: string | null;
  pattern_pdf_filename: string | null;
  pattern_drive_url: string;
};

const emptyForm = (isWishlist = false): FormState => ({
  title: "",
  designer: "",
  category: "",
  status: "In Queue",
  fabric_type: "",
  fabric_recs: "",
  yardage: "",
  notions: "",
  size_info: "",
  purchase_url: "",
  is_wishlist: isWishlist,
  notes: "",
  cover_path: null,
  instructions_pdf_path: null,
  instructions_drive_url: "",
  pattern_pdf_path: null,
  pattern_pdf_filename: null,
  pattern_drive_url: "",
});

function formFromPattern(p: SewingPatternRow): FormState {
  return {
    title: p.title,
    designer: p.designer ?? "",
    category: p.category ?? "",
    status: p.status,
    fabric_type: p.fabric_type ?? "",
    fabric_recs: p.fabric_recs ?? "",
    yardage: p.yardage ?? "",
    notions: p.notions ?? "",
    size_info: p.size_info ?? "",
    purchase_url: p.purchase_url ?? "",
    is_wishlist: p.is_wishlist,
    notes: p.notes ?? "",
    cover_path: p.cover_path,
    instructions_pdf_path: p.instructions_pdf_path,
    instructions_drive_url: p.instructions_drive_url ?? "",
    pattern_pdf_path: p.pattern_pdf_path,
    pattern_pdf_filename: p.pattern_pdf_filename,
    pattern_drive_url: p.pattern_drive_url ?? "",
  };
}

export function SewingPatternModal({
  open,
  pattern,
  defaultIsWishlist = false,
  designerSuggestions,
  onClose,
  onSaved,
  onDeleted,
}: SewingPatternModalProps) {
  const titleId = useId();
  const datalistId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [pendingCover, setPendingCover] = useState<File | null>(null);
  const [pendingInstructionsPdf, setPendingInstructionsPdf] = useState<File | null>(null);
  const [pendingPatternPdf, setPendingPatternPdf] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [removeInstructionsPdf, setRemoveInstructionsPdf] = useState(false);
  const [removePatternPdf, setRemovePatternPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      setError(null);
      setPendingCover(null);
      setPendingInstructionsPdf(null);
      setPendingPatternPdf(null);
      setRemoveCover(false);
      setRemoveInstructionsPdf(false);
      setRemovePatternPdf(false);
      setCoverPreview(null);
      return;
    }
    if (pattern) {
      setForm(formFromPattern(pattern));
      setRemoveCover(false);
      setRemoveInstructionsPdf(false);
      setRemovePatternPdf(false);
      setPendingCover(null);
      setPendingInstructionsPdf(null);
      setPendingPatternPdf(null);
      if (pattern.cover_path) {
        const supabase = createBrowserClientInstance();
        void resolveSewingCoverUrl(supabase, pattern.cover_path).then((url) =>
          setCoverPreview(url),
        );
      } else setCoverPreview(null);
    } else {
      setForm(emptyForm(defaultIsWishlist));
      setCoverPreview(null);
    }
  }, [open, pattern, defaultIsWishlist]);

  useEffect(() => {
    if (!pendingCover) return;
    const url = URL.createObjectURL(pendingCover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingCover]);

  const handleSave = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!form.title.trim()) {
        setError("Pattern name is required.");
        return;
      }

      setLoading(true);
      setError(null);

      const supabase = createBrowserClientInstance();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }

      let cover_path = removeCover ? null : form.cover_path;
      let instructions_pdf_path = removeInstructionsPdf
        ? null
        : form.instructions_pdf_path;
      let pattern_pdf_path = removePatternPdf ? null : form.pattern_pdf_path;
      let pattern_pdf_filename = removePatternPdf
        ? null
        : form.pattern_pdf_filename;

      const oldCover = pattern?.cover_path ?? null;
      const oldInstructions = pattern?.instructions_pdf_path ?? null;
      const oldPatternPdf = pattern?.pattern_pdf_path ?? null;

      try {
        if (pendingCover) {
          const fileId = crypto.randomUUID();
          const path = sewingCoverStoragePath(user.id, fileId);
          const compressed = await compressToWebpCover(pendingCover);
          const up = await uploadPatternCover(supabase, path, compressed);
          if (up.error) throw up.error;
          cover_path = path;
        } else if (removeCover && oldCover) {
          await removePatternCover(supabase, oldCover);
        }

        if (pendingInstructionsPdf) {
          const fileId = crypto.randomUUID();
          const path = sewingInstructionsPdfPath(user.id, fileId);
          const up = await uploadSewingObject(
            supabase,
            path,
            pendingInstructionsPdf,
            "application/pdf",
          );
          if (up.error) throw up.error;
          instructions_pdf_path = path;
        } else if (removeInstructionsPdf && oldInstructions) {
          await removeSewingObject(supabase, oldInstructions);
        }

        if (pendingPatternPdf) {
          const fileId = crypto.randomUUID();
          const path = sewingPatternPdfPath(user.id, fileId);
          const up = await uploadSewingObject(
            supabase,
            path,
            pendingPatternPdf,
            "application/pdf",
          );
          if (up.error) throw up.error;
          pattern_pdf_path = path;
          pattern_pdf_filename = pendingPatternPdf.name;
        } else if (removePatternPdf && oldPatternPdf) {
          await removeSewingObject(supabase, oldPatternPdf);
        }

        if (pendingCover && oldCover && oldCover !== cover_path) {
          await removePatternCover(supabase, oldCover);
        }
        if (
          pendingInstructionsPdf &&
          oldInstructions &&
          oldInstructions !== instructions_pdf_path
        ) {
          await removeSewingObject(supabase, oldInstructions);
        }
        if (
          pendingPatternPdf &&
          oldPatternPdf &&
          oldPatternPdf !== pattern_pdf_path
        ) {
          await removeSewingObject(supabase, oldPatternPdf);
        }

        const payload = {
          title: form.title.trim(),
          designer: form.designer,
          category: form.category,
          status: form.is_wishlist ? "In Queue" : form.status,
          fabric_type: form.fabric_type,
          fabric_recs: form.fabric_recs,
          yardage: form.yardage,
          notions: form.notions,
          size_info: form.size_info,
          purchase_url: form.purchase_url,
          is_wishlist: form.is_wishlist,
          notes: form.notes,
          cover_path,
          instructions_pdf_path,
          instructions_drive_url: form.instructions_drive_url,
          pattern_pdf_path,
          pattern_pdf_filename,
          pattern_drive_url: form.pattern_drive_url,
        };

        if (pattern) {
          const { data, error: updateError } = await updateSewingPattern(
            supabase,
            pattern.id,
            payload,
          );
          if (updateError) throw updateError;
          if (data) onSaved(data);
        } else {
          const { data, error: createError } = await createSewingPattern(
            supabase,
            payload,
          );
          if (createError) throw createError;
          if (data) onSaved(data);
        }

        onClose();
      } catch (err) {
        setError(formatSupabaseError(err));
      } finally {
        setLoading(false);
      }
    },
    [
      form,
      onClose,
      onSaved,
      pattern,
      pendingCover,
      pendingInstructionsPdf,
      pendingPatternPdf,
      removeCover,
      removeInstructionsPdf,
      removePatternPdf,
    ],
  );

  const saveViaShortcut = useCallback(() => {
    invokeFormSubmitHandler(handleSave);
  }, [handleSave]);

  useSaveKeyboardShortcut(open, loading, saveViaShortcut);

  async function handleMoveToLibrary() {
    if (!pattern) return;
    setLoading(true);
    const supabase = createBrowserClientInstance();
    try {
      const { data, error: moveError } = await moveSewingPatternToLibrary(
        supabase,
        pattern.id,
      );
      if (moveError) throw moveError;
      if (data) {
        onSaved(data);
        onClose();
      }
    } catch (err) {
      setError(formatSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!pattern) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setLoading(true);
    const supabase = createBrowserClientInstance();
    try {
      if (pattern.cover_path) {
        await removePatternCover(supabase, pattern.cover_path);
      }
      if (pattern.instructions_pdf_path) {
        await removeSewingObject(supabase, pattern.instructions_pdf_path);
      }
      if (pattern.pattern_pdf_path) {
        await removeSewingObject(supabase, pattern.pattern_pdf_path);
      }
      const { error: deleteError } = await deleteSewingPattern(
        supabase,
        pattern.id,
      );
      if (deleteError) throw deleteError;
      onDeleted?.(pattern.id);
      onClose();
    } catch (err) {
      setError(formatSupabaseError(err));
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
            {pattern ? "Edit pattern" : form.is_wishlist ? "Add to wishlist" : "Add pattern"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5">
            <X className="size-5 text-zinc-600" />
          </button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSave}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="flex flex-col gap-1.5">
              <span className={formLabelClass}>Save to</span>
              <div className="inline-flex w-fit rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, is_wishlist: false }))}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${!form.is_wishlist ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"}`}
                >
                  My Library
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      is_wishlist: true,
                      status: "In Queue",
                    }))
                  }
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${form.is_wishlist ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"}`}
                >
                  Wishlist
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 flex flex-col gap-1.5">
                <span className={formLabelClass}>
                  Pattern name <span className="text-red-600">*</span>
                </span>
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  required
                  className={formInputMdClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={formLabelClass}>Designer / brand</span>
                <input
                  list={datalistId}
                  value={form.designer}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, designer: e.target.value }))
                  }
                  className={formInputMdClass}
                />
                <datalist id={datalistId}>
                  {designerSuggestions.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={formLabelClass}>Category</span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className={formInputMdClass}
                >
                  <option value="">—</option>
                  {sewingCategorySelectOptions(form.category).map((c) => (
                    <option key={c} value={c}>
                      {c}
                      {c === "Bag / Accessory" ? " (legacy)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {!form.is_wishlist ? (
                <label className="flex flex-col gap-1.5">
                  <span className={formLabelClass}>Status</span>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        status: e.target.value as SewingStatus,
                      }))
                    }
                    className={formInputMdClass}
                  >
                    {SEWING_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="sm:col-span-2 flex flex-col gap-1.5">
                <span className={formLabelClass}>
                  Purchase / pattern URL
                  {form.is_wishlist ? (
                    <span className="ml-1 font-normal text-zinc-500">
                      (shop or pattern page)
                    </span>
                  ) : null}
                </span>
                <input
                  type="url"
                  value={form.purchase_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, purchase_url: e.target.value }))
                  }
                  className={formInputMdClass}
                  placeholder="https://…"
                />
              </label>
            </div>

            <div className="sm:col-span-2">
              <FabricTypePicker
                value={form.fabric_type}
                onChange={(fabric_type) =>
                  setForm((f) => ({ ...f, fabric_type }))
                }
              />
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={formLabelClass}>
                Fabric recommendations & yardage
              </span>
              <textarea
                value={form.fabric_recs}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fabric_recs: e.target.value }))
                }
                rows={2}
                className={formTextareaClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={formLabelClass}>Yardage</span>
              <input
                value={form.yardage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, yardage: e.target.value }))
                }
                className={formInputMdClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={formLabelClass}>Notions & hardware</span>
              <textarea
                value={form.notions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notions: e.target.value }))
                }
                rows={2}
                className={formTextareaClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={formLabelClass}>Size range / my size</span>
              <input
                value={form.size_info}
                onChange={(e) =>
                  setForm((f) => ({ ...f, size_info: e.target.value }))
                }
                className={formInputMdClass}
              />
            </label>

            <CoverUpload
              preview={coverPreview}
              removeCover={removeCover}
              onPick={(file) => {
                setPendingCover(file);
                setRemoveCover(false);
              }}
              onRemove={() => {
                setPendingCover(null);
                setRemoveCover(true);
                setCoverPreview(null);
              }}
            />

            <PdfDriveSlot
              title="Instructions"
              driveUrl={form.instructions_drive_url}
              onDriveUrlChange={(v) =>
                setForm((f) => ({ ...f, instructions_drive_url: v }))
              }
              pendingFile={pendingInstructionsPdf}
              onPickFile={(file) => {
                setPendingInstructionsPdf(file);
                setRemoveInstructionsPdf(false);
              }}
              onRemoveFile={() => {
                setPendingInstructionsPdf(null);
                setRemoveInstructionsPdf(true);
              }}
              hasStoredPdf={
                Boolean(form.instructions_pdf_path) && !removeInstructionsPdf
              }
              storedLabel={
                pendingInstructionsPdf?.name ?? "PDF on file"
              }
            />

            <PdfDriveSlot
              title="Pattern files (A0 / Letter / Projector)"
              driveUrl={form.pattern_drive_url}
              onDriveUrlChange={(v) =>
                setForm((f) => ({ ...f, pattern_drive_url: v }))
              }
              pendingFile={pendingPatternPdf}
              onPickFile={(file) => {
                setPendingPatternPdf(file);
                setRemovePatternPdf(false);
              }}
              onRemoveFile={() => {
                setPendingPatternPdf(null);
                setRemovePatternPdf(true);
              }}
              hasStoredPdf={Boolean(form.pattern_pdf_path) && !removePatternPdf}
              storedLabel={
                pendingPatternPdf?.name ??
                form.pattern_pdf_filename ??
                "PDF on file"
              }
            />

            <label className="flex flex-col gap-1.5">
              <span className={formLabelClass}>Project notes</span>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={4}
                className={formTextareaClass}
              />
            </label>

            {error ? (
              <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {pattern?.is_wishlist ? (
                <button
                  type="button"
                  onClick={() => void handleMoveToLibrary()}
                  disabled={loading}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Move to Library
                </button>
              ) : null}
              {pattern ? (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                  {confirmDelete ? "Confirm delete" : "Delete"}
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                {loading ? "Saving…" : "Save"}
                <SaveShortcutHint />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CoverUpload({
  preview,
  removeCover,
  onPick,
  onRemove,
}: {
  preview: string | null;
  removeCover: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <span className={formLabelClass}>Cover thumbnail</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center hover:border-zinc-300"
      >
        <ImageIcon className="mx-auto size-8 text-zinc-400" />
        <p className="mt-2 text-sm text-zinc-700">Upload cover (WebP)</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
      {preview && !removeCover ? (
        <div className="relative mx-auto aspect-video w-full max-w-xs overflow-hidden rounded-lg bg-zinc-100">
          <Image
            src={preview}
            alt=""
            fill
            className="object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : null}
      {preview && !removeCover ? (
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-medium text-red-600 hover:underline"
        >
          Remove cover
        </button>
      ) : null}
    </div>
  );
}

function PdfDriveSlot({
  title,
  driveUrl,
  onDriveUrlChange,
  pendingFile,
  onPickFile,
  onRemoveFile,
  hasStoredPdf,
  storedLabel,
}: {
  title: string;
  driveUrl: string;
  onDriveUrlChange: (v: string) => void;
  pendingFile: File | null;
  onPickFile: (f: File) => void;
  onRemoveFile: () => void;
  hasStoredPdf: boolean;
  storedLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-xs font-medium text-zinc-500">
          Google Drive URL
        </span>
        <input
          type="url"
          value={driveUrl}
          onChange={(e) => onDriveUrlChange(e.target.value)}
          className={formInputMdClass}
          placeholder="https://drive.google.com/…"
        />
      </label>
      <div className="mt-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
        >
          <FileText className="size-4" />
          Upload PDF
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPickFile(file);
            e.target.value = "";
          }}
        />
        {(pendingFile || hasStoredPdf) && (
          <p className="mt-2 text-xs text-zinc-600">{storedLabel}</p>
        )}
        {(pendingFile || hasStoredPdf) && (
          <button
            type="button"
            onClick={onRemoveFile}
            className="mt-1 text-xs font-medium text-red-600 hover:underline"
          >
            Remove PDF
          </button>
        )}
      </div>
    </div>
  );
}