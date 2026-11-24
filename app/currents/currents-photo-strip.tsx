"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { CURRENTS_MAX_PHOTOS } from "@/lib/currents/constants";

type CurrentsPhotoStripProps = {
  active: boolean;
  photoUrls: string[];
  pendingFiles: File[];
  onPhotoUrlsChange: (urls: string[]) => void;
  onPendingFilesChange: (files: File[]) => void;
};

export function CurrentsPhotoStrip({
  active,
  photoUrls,
  pendingFiles,
  onPhotoUrlsChange,
  onPendingFilesChange,
}: CurrentsPhotoStripProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [blobPreviews, setBlobPreviews] = useState<string[]>([]);

  const slotCount = photoUrls.length + pendingFiles.length;
  const canAdd = slotCount < CURRENTS_MAX_PHOTOS;

  useEffect(() => {
    const urls = pendingFiles.map((f) => URL.createObjectURL(f));
    setBlobPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingFiles]);

  const applyFiles = useCallback(
    (files: FileList | File[]) => {
      const next: File[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        if (slotCount + next.length >= CURRENTS_MAX_PHOTOS) break;
        next.push(file);
      }
      if (next.length > 0) {
        onPendingFilesChange([...pendingFiles, ...next]);
      }
    },
    [onPendingFilesChange, pendingFiles, slotCount],
  );

  useEffect(() => {
    if (!active) return;
    function onPaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (!items || !canAdd) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            applyFiles([file]);
            return;
          }
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [active, applyFiles, canAdd]);

  function removeAt(index: number, pending: boolean) {
    if (pending) {
      onPendingFilesChange(pendingFiles.filter((_, i) => i !== index));
    } else {
      onPhotoUrlsChange(photoUrls.filter((_, i) => i !== index));
    }
  }

  const figures: { src: string; pending: boolean; index: number }[] = [
    ...photoUrls.map((src, index) => ({ src, pending: false, index })),
    ...blobPreviews.map((src, index) => ({
      src,
      pending: true,
      index,
    })),
  ];

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium tracking-[0.2em] text-stone-500 uppercase">
        Photo strip
      </p>
      <div
        className={`flex flex-wrap gap-4 rounded-lg border border-dashed p-3 transition ${
          dragOver
            ? "border-stone-400 bg-stone-100/80"
            : "border-stone-200/90 bg-stone-50/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) applyFiles(e.dataTransfer.files);
        }}
      >
        {figures.map((fig, displayIndex) => (
          <figure
            key={`${fig.pending}-${fig.index}-${fig.src}`}
            className="relative w-[7.5rem] shrink-0 bg-white p-2 pb-5 shadow-sm border border-stone-200"
          >
            <span className="font-mono text-[9px] tracking-widest text-stone-500 uppercase">
              Fig. {String(displayIndex + 1).padStart(2, "0")}
            </span>
            <div className="relative mt-1 aspect-[4/5] w-full overflow-hidden bg-stone-100">
              <Image
                src={fig.src}
                alt=""
                fill
                className="object-cover"
                sizes="120px"
                loading="lazy"
                unoptimized
              />
            </div>
            <button
              type="button"
              onClick={() => removeAt(fig.index, fig.pending)}
              className="absolute -right-1 -top-1 rounded-full border border-stone-200 bg-white p-1 text-stone-600 shadow-sm hover:text-red-700"
              aria-label="Remove photo"
            >
              <Trash2 className="size-3" />
            </button>
          </figure>
        ))}
        {canAdd ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-[8.5rem] w-[7.5rem] flex-col items-center justify-center gap-1 border border-stone-200 bg-white/80 text-stone-600 hover:bg-stone-50"
          >
            <ImagePlus className="size-5" aria-hidden />
            <span className="text-[10px] font-medium">Drop · paste · click</span>
          </button>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) applyFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}