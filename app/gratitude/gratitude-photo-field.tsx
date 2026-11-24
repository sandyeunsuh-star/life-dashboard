"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type GratitudePhotoFieldProps = {
  active: boolean;
  photoUrl: string | null;
  pendingFile: File | null;
  onPhotoUrlChange: (url: string | null) => void;
  onPendingFileChange: (file: File | null) => void;
};

export function GratitudePhotoField({
  active,
  photoUrl,
  pendingFile,
  onPhotoUrlChange,
  onPendingFileChange,
}: GratitudePhotoFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [blobPreview, setBlobPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      setBlobPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setBlobPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const previewSrc = blobPreview ?? photoUrl;

  const applyFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      onPendingFileChange(file);
    },
    [onPendingFileChange],
  );

  useEffect(() => {
    if (!active) return;
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
  }, [active, applyFile]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-500">Photo (optional)</p>
      <div
        className={`flex flex-wrap items-start gap-3 rounded-lg border border-dashed p-3 ${
          dragOver ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 bg-white"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) applyFile(file);
        }}
      >
        {previewSrc ? (
          <figure className="relative size-24 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
            <Image
              src={previewSrc}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
              loading="lazy"
              unoptimized
            />
            <button
              type="button"
              onClick={() => {
                onPhotoUrlChange(null);
                onPendingFileChange(null);
              }}
              className="absolute -right-1 -top-1 rounded-full border border-zinc-200 bg-white p-1 text-zinc-600 shadow-sm hover:text-red-600"
              aria-label="Remove photo"
            >
              <Trash2 className="size-3" />
            </button>
          </figure>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex size-24 flex-col items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
          >
            <ImagePlus className="size-5" aria-hidden />
            <span className="text-[10px]">Paste · drop · click</span>
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) applyFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}