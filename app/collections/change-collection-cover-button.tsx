"use client";

import { ImagePlus } from "lucide-react";
import { useId, useRef, useState } from "react";

import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { uploadCollectionCoverFromFile } from "@/lib/supabase/queries/collection-covers";
import type { Collection } from "@/lib/supabase/types/collection";

type ChangeCollectionCoverButtonProps = {
  collection: Collection;
  onUpdated: (collection: Collection) => void;
  variant?: "button" | "overlay";
  label?: string;
  className?: string;
};

export function ChangeCollectionCoverButton({
  collection,
  onUpdated,
  variant = "button",
  label = "Change cover",
  className,
}: ChangeCollectionCoverButtonProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);

    const supabase = createBrowserClientInstance();
    const { data, error: uploadError } = await uploadCollectionCoverFromFile(
      supabase,
      collection.id,
      file,
    );

    setLoading(false);

    if (uploadError) {
      setError(formatSupabaseError(uploadError));
      return;
    }

    if (data) {
      onUpdated(data);
    }
  }

  const baseClass =
    variant === "overlay"
      ? "rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-sm backdrop-blur hover:bg-white"
      : className ??
        "inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50";

  return (
    <div className="inline-flex flex-col">
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept="image/*"
      className="sr-only"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) void handleFile(file);
      }}
    />
    <label
      htmlFor={inputId}
      className={`${baseClass} cursor-pointer ${loading ? "pointer-events-none opacity-60" : ""}`}
    >
      <ImagePlus className="size-3.5" aria-hidden />
      {loading ? "Uploading…" : label}
    </label>
    {error ? (
      <p className="mt-1 text-xs text-red-700">{error}</p>
    ) : null}
    </div>
  );
}