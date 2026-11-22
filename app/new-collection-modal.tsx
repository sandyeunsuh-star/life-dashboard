"use client";

import { X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { formatSupabaseError } from "@/lib/supabase/errors";
import { createCollection } from "@/lib/supabase/queries/collections";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import type { Collection } from "@/lib/supabase/types/collection";
import {
  formInputMdClass,
  formLabelClass,
  formTextareaClass,
} from "@/lib/ui/form-styles";

type NewCollectionModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (collection: Collection) => void;
};

export function NewCollectionModal({
  open,
  onClose,
  onCreated,
}: NewCollectionModalProps) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setError(null);
      setLoading(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClientInstance();
    const { data, error: createError } = await createCollection(supabase, {
      name,
      description: description.trim() || undefined,
    });

    setLoading(false);

    if (createError) {
      setError(formatSupabaseError(createError));
      return;
    }

    if (!data) {
      setError(
        formatSupabaseError({
          message: "Collection was not returned after insert.",
          code: "PGRST116",
        }),
      );
      return;
    }

    onCreated?.(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-zinc-900"
            >
              New collection
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Organize recipes, places, or anything else you track.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="collection-name" className={formLabelClass}>
              Name
            </label>
            <input
              id="collection-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className={formInputMdClass}
              placeholder="Weeknight dinners"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="collection-description"
              className={formLabelClass}
            >
              Description
              <span className="font-normal text-zinc-400"> (optional)</span>
            </label>
            <textarea
              id="collection-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={formTextareaClass}
              placeholder="Quick meals for busy nights"
            />
          </div>

          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            A URL slug is created from the name when you save (with a unique
            suffix if needed).
          </p>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-wrap break-words">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}