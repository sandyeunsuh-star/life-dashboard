"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

function isLikelyImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

type VaultThumbnailFieldProps = {
  open: boolean;
  imageUrl: string | null;
  pendingFile: File | null;
  onImageUrlChange: (url: string | null) => void;
  onPendingFileChange: (file: File | null) => void;
};

export function VaultThumbnailField({
  open,
  imageUrl,
  pendingFile,
  onImageUrlChange,
  onPendingFileChange,
}: VaultThumbnailFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [blobPreview, setBlobPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setUrlDraft("");
      setDragOver(false);
    } else if (imageUrl && !pendingFile) {
      setUrlDraft(imageUrl);
    }
  }, [open, imageUrl, pendingFile]);

  useEffect(() => {
    if (!pendingFile) {
      setBlobPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setBlobPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const previewSrc = blobPreview ?? (imageUrl?.trim() || null);

  const applyFile = useCallback(
    (file: File | undefined) => {
      if (!file || !file.type.startsWith("image/")) return;
      onPendingFileChange(file);
      onImageUrlChange(null);
      setUrlDraft("");
    },
    [onImageUrlChange, onPendingFileChange],
  );

  useEffect(() => {
    if (!open) return;

    function onPaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            applyFile(file);
            return;
          }
        }
      }
    }

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, applyFile]);

  function clearThumbnail() {
    onPendingFileChange(null);
    onImageUrlChange(null);
    setUrlDraft("");
  }

  function commitUrlDraft() {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      if (!pendingFile) onImageUrlChange(null);
      return;
    }
    if (!isLikelyImageUrl(trimmed)) return;
    onPendingFileChange(null);
    onImageUrlChange(trimmed);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={formLabelClass}>
        Thumbnail <span className="font-normal text-zinc-400">(optional)</span>
      </span>

      {previewSrc ? (
        <div className="flex items-start gap-3">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 p-1.5">
            <Image
              src={previewSrc}
              alt="Thumbnail preview"
              width={80}
              height={80}
              unoptimized
              className="size-full object-contain"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-xs text-zinc-600">
              {pendingFile ? "Ready to upload on save" : "External image link"}
            </p>
            <button
              type="button"
              onClick={clearThumbnail}
              className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Remove
            </button>
          </div>
        </div>
      ) : null}

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          applyFile(e.dataTransfer.files?.[0]);
        }}
        className={[
          "cursor-pointer rounded-xl border border-dashed px-4 py-4 text-center transition",
          dragOver
            ? "border-zinc-400 bg-zinc-50"
            : "border-zinc-200 bg-white hover:border-zinc-300",
        ].join(" ")}
      >
        <div className="mx-auto flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
          <ImagePlus className="size-4" aria-hidden />
        </div>
        <p className="mt-2 text-sm font-medium text-zinc-800">
          Drop, click, or paste an image
        </p>
        <p className="text-xs text-zinc-500">
          ⌘V / Ctrl+V works while this modal is open
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            applyFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="vault-image-url" className="text-xs text-zinc-600">
          Or paste image URL
        </label>
        <input
          id="vault-image-url"
          type="url"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={commitUrlDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitUrlDraft();
            }
          }}
          placeholder="https://…"
          className={formInputMdClass}
        />
      </div>
    </div>
  );
}