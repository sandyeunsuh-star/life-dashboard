"use client";

import { FileText, ImageIcon, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  KNITTING_CATEGORIES,
  KNITTING_STATUSES,
  YARN_WEIGHTS,
  type KnittingStatus,
} from "@/lib/knitting/constants";
import { NeedleSizePicker } from "@/app/knitting/needle-size-picker";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { compressToWebpCover } from "@/lib/supabase/images/compress-cover";
import {
  createKnittingPattern,
  deleteKnittingPattern,
  moveKnittingPatternToLibrary,
  updateKnittingPattern,
} from "@/lib/supabase/queries/knitting-patterns";
import {
  createKnittingSignedUrl,
  knittingPdfPath,
  knittingThumbnailPath,
  removeKnittingObject,
  uploadKnittingObject,
} from "@/lib/supabase/storage/knitting-patterns";
import type { KnittingPatternRow } from "@/lib/supabase/types/knitting-pattern";
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

type KnittingPatternModalProps = {
  open: boolean;
  pattern: KnittingPatternRow | null;
  defaultIsWishlist?: boolean;
  designerSuggestions: string[];
  onClose: () => void;
  onSaved: (pattern: KnittingPatternRow) => void;
  onDeleted?: (id: string) => void;
};

type FormState = {
  title: string;
  designer: string;
  category: string;
  status: KnittingStatus;
  yarn_weight: string;
  needle_size: string;
  gauge: string;
  yardage: string;
  notes: string;
  purchase_url: string;
  is_wishlist: boolean;
  cover_path: string | null;
  pdf_path: string | null;
  pdf_filename: string | null;
};

const emptyForm = (isWishlist = false): FormState => ({
  title: "",
  designer: "",
  category: "",
  status: "In Queue",
  yarn_weight: "",
  needle_size: "",
  gauge: "",
  yardage: "",
  notes: "",
  purchase_url: "",
  is_wishlist: isWishlist,
  cover_path: null,
  pdf_path: null,
  pdf_filename: null,
});

function formFromPattern(p: KnittingPatternRow): FormState {
  return {
    title: p.title,
    designer: p.designer ?? "",
    category: p.category ?? "",
    status: p.status,
    yarn_weight: p.yarn_weight ?? "",
    needle_size: p.needle_size ?? "",
    gauge: p.gauge ?? "",
    yardage: p.yardage ?? "",
    notes: p.notes ?? "",
    purchase_url: p.purchase_url ?? "",
    is_wishlist: p.is_wishlist,
    cover_path: p.cover_path,
    pdf_path: p.pdf_path,
    pdf_filename: p.pdf_filename,
  };
}

export function KnittingPatternModal({
  open,
  pattern,
  defaultIsWishlist = false,
  designerSuggestions,
  onClose,
  onSaved,
  onDeleted,
}: KnittingPatternModalProps) {
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const datalistId = useId();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [pendingCover, setPendingCover] = useState<File | null>(null);
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [removePdf, setRemovePdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      setError(null);
      setPendingCover(null);
      setPendingPdf(null);
      setRemoveCover(false);
      setRemovePdf(false);
      setCoverPreview(null);
      return;
    }

    if (pattern) {
      setForm(formFromPattern(pattern));
      setRemoveCover(false);
      setRemovePdf(false);
      setPendingCover(null);
      setPendingPdf(null);
      if (pattern.cover_path) {
        const supabase = createBrowserClientInstance();
        void createKnittingSignedUrl(supabase, pattern.cover_path).then(
          ({ url }) => setCoverPreview(url),
        );
      } else {
        setCoverPreview(null);
      }
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
      let pdf_path = removePdf ? null : form.pdf_path;
      let pdf_filename = removePdf ? null : form.pdf_filename;

      const oldCover = pattern?.cover_path ?? null;
      const oldPdf = pattern?.pdf_path ?? null;

      try {
        if (pendingCover) {
          const fileId = crypto.randomUUID();
          const path = knittingThumbnailPath(user.id, fileId);
          const compressed = await compressToWebpCover(pendingCover);
          const up = await uploadKnittingObject(
            supabase,
            path,
            compressed,
            "image/webp",
          );
          if (up.error) throw up.error;
          cover_path = path;
        } else if (removeCover && oldCover) {
          await removeKnittingObject(supabase, oldCover);
        }

        if (pendingPdf) {
          const fileId = crypto.randomUUID();
          const path = knittingPdfPath(user.id, fileId);
          const up = await uploadKnittingObject(
            supabase,
            path,
            pendingPdf,
            "application/pdf",
          );
          if (up.error) throw up.error;
          pdf_path = path;
          pdf_filename = pendingPdf.name;
        } else if (removePdf && oldPdf) {
          await removeKnittingObject(supabase, oldPdf);
        }

        if (
          pendingCover &&
          oldCover &&
          oldCover !== cover_path
        ) {
          await removeKnittingObject(supabase, oldCover);
        }
        if (pendingPdf && oldPdf && oldPdf !== pdf_path) {
          await removeKnittingObject(supabase, oldPdf);
        }

        const payload = {
          title: form.title.trim(),
          designer: form.designer,
          category: form.category,
          status: form.is_wishlist ? "In Queue" : form.status,
          yarn_weight: form.yarn_weight,
          needle_size: form.needle_size,
          gauge: form.gauge,
          yardage: form.yardage,
          notes: form.notes,
          is_wishlist: form.is_wishlist,
          purchase_url: form.purchase_url,
          cover_path,
          pdf_path,
          pdf_filename,
        };

        if (pattern) {
          const { data, error: updateError } = await updateKnittingPattern(
            supabase,
            pattern.id,
            payload,
          );
          if (updateError) throw updateError;
          if (data) onSaved(data);
        } else {
          const { data, error: createError } = await createKnittingPattern(
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
    [form, onClose, onSaved, pattern, pendingCover, pendingPdf, removeCover, removePdf],
  );

  const saveViaShortcut = useCallback(() => {
    invokeFormSubmitHandler(handleSave);
  }, [handleSave]);

  useSaveKeyboardShortcut(open, loading, saveViaShortcut);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onClose]);

  async function openCurrentPdf() {
    const path = removePdf ? null : form.pdf_path;
    if (!path) return;
    const supabase = createBrowserClientInstance();
    const { url } = await createKnittingSignedUrl(supabase, path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleMoveToLibrary() {
    if (!pattern) return;
    setLoading(true);
    setError(null);
    const supabase = createBrowserClientInstance();
    try {
      const { data, error: moveError } = await moveKnittingPatternToLibrary(
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
    setError(null);
    const supabase = createBrowserClientInstance();

    try {
      if (pattern.cover_path) {
        await removeKnittingObject(supabase, pattern.cover_path);
      }
      if (pattern.pdf_path) {
        await removeKnittingObject(supabase, pattern.pdf_path);
      }
      const { error: deleteError } = await deleteKnittingPattern(
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

  const pdfLabel =
    pendingPdf?.name ??
    (removePdf ? null : form.pdf_filename) ??
    (form.pdf_path ? "PDF on file" : null);

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
            {pattern
              ? form.is_wishlist
                ? "Edit wishlist item"
                : "Edit pattern"
              : form.is_wishlist
                ? "Add to wishlist"
                : "Add pattern"}
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
                  onClick={() =>
                    setForm((f) => ({ ...f, is_wishlist: false }))
                  }
                  className={[
                    "rounded-md px-3 py-1.5 text-xs font-medium transition",
                    !form.is_wishlist
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900",
                  ].join(" ")}
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
                  className={[
                    "rounded-md px-3 py-1.5 text-xs font-medium transition",
                    form.is_wishlist
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900",
                  ].join(" ")}
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
                <span className={formLabelClass}>Designer</span>
                <input
                  list={datalistId}
                  value={form.designer}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, designer: e.target.value }))
                  }
                  className={formInputMdClass}
                  placeholder="Designer name"
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
                  {KNITTING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
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
                        status: e.target.value as KnittingStatus,
                      }))
                    }
                    className={formInputMdClass}
                  >
                    {KNITTING_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label
                className={`flex flex-col gap-1.5 ${form.is_wishlist ? "sm:col-span-2" : ""}`}
              >
                <span className={formLabelClass}>
                  Pattern link / URL
                  {form.is_wishlist ? (
                    <span className="ml-1 font-normal text-zinc-500">
                      (shop or Ravelry page)
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
              <label className="flex flex-col gap-1.5">
                <span className={formLabelClass}>Yarn weight</span>
                <select
                  value={form.yarn_weight}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, yarn_weight: e.target.value }))
                  }
                  className={formInputMdClass}
                >
                  <option value="">—</option>
                  {YARN_WEIGHTS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-2">
                <NeedleSizePicker
                  value={form.needle_size}
                  onChange={(needle_size) =>
                    setForm((f) => ({ ...f, needle_size }))
                  }
                />
              </div>
              <label className="flex flex-col gap-1.5">
                <span className={formLabelClass}>Gauge</span>
                <input
                  value={form.gauge}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gauge: e.target.value }))
                  }
                  className={formInputMdClass}
                  placeholder="20 sts x 28 rows = 10cm"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={formLabelClass}>Yardage / meterage</span>
                <input
                  value={form.yardage}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, yardage: e.target.value }))
                  }
                  className={formInputMdClass}
                />
              </label>
            </div>

            <FileDropField
              label="Cover thumbnail"
              accept="image/*"
              icon={<ImageIcon className="size-5" />}
              hint="WebP, max 800px wide"
              preview={
                coverPreview && !removeCover ? (
                  <div className="relative mx-auto mt-2 aspect-video w-full max-w-xs overflow-hidden rounded-lg bg-zinc-100">
                    <Image
                      src={coverPreview}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : null
              }
              onFile={(file) => {
                setPendingCover(file);
                setRemoveCover(false);
              }}
              extra={
                (form.cover_path || pendingCover) && !removeCover ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingCover(null);
                      setRemoveCover(true);
                      setCoverPreview(null);
                    }}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove cover
                  </button>
                ) : null
              }
            />

            <FileDropField
              label="Pattern PDF"
              accept=".pdf,application/pdf"
              icon={<FileText className="size-5" />}
              hint=".pdf"
              preview={
                pdfLabel ? (
                  <p className="mt-2 text-xs text-zinc-600">{pdfLabel}</p>
                ) : null
              }
              onFile={(file) => {
                if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
                  setError("Please choose a PDF file.");
                  return;
                }
                setPendingPdf(file);
                setRemovePdf(false);
              }}
              extra={
                <div className="flex flex-wrap gap-2">
                  {form.pdf_path && !removePdf && !pendingPdf ? (
                    <button
                      type="button"
                      onClick={() => void openCurrentPdf()}
                      className="text-xs font-medium text-zinc-800 underline"
                    >
                      Open PDF
                    </button>
                  ) : null}
                  {(form.pdf_path || pendingPdf) && !removePdf ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingPdf(null);
                        setRemovePdf(true);
                      }}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove PDF
                    </button>
                  ) : null}
                </div>
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
                placeholder="Size knit, needle adjustments, yarn used, errata…"
              />
            </label>

            {error ? (
              <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              {pattern?.is_wishlist ? (
                <button
                  type="button"
                  onClick={() => void handleMoveToLibrary()}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                >
                  Move to Library
                </button>
              ) : null}
              {pattern ? (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="size-4" />
                  {confirmDelete ? "Confirm delete" : "Delete"}
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
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
                className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
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

function FileDropField({
  label,
  accept,
  hint,
  icon,
  preview,
  onFile,
  extra,
}: {
  label: string;
  accept: string;
  hint: string;
  icon: React.ReactNode;
  preview: React.ReactNode;
  onFile: (file: File) => void;
  extra?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function pick() {
    inputRef.current?.click();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className={formLabelClass}>{label}</span>
      <div
        role="button"
        tabIndex={0}
        onClick={pick}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pick();
          }
        }}
        onDragOver={(e: React.DragEvent) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e: React.DragEvent) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={[
          "cursor-pointer rounded-xl border border-dashed px-4 py-6 text-center transition",
          dragOver
            ? "border-zinc-400 bg-zinc-50"
            : "border-zinc-200 bg-white hover:border-zinc-300",
        ].join(" ")}
      >
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
          {icon}
        </div>
        <p className="mt-2 text-sm font-medium text-zinc-800">
          Drag & drop or click to upload
        </p>
        <p className="text-xs text-zinc-500">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
        {preview}
      </div>
      {extra}
    </div>
  );
}