"use client";

import { X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { formatSupabaseError } from "@/lib/supabase/errors";
import { updateCollection } from "@/lib/supabase/queries/collections";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import type { Collection } from "@/lib/supabase/types/collection";
import {
  formInputMdClass,
  formLabelClass,
  formTextareaClass,
} from "@/lib/ui/form-styles";

type EditCollectionDialogProps = {
  open: boolean;
  collection: Collection;
  onClose: () => void;
  onSaved: (collection: Collection) => void;
};

export function EditCollectionDialog({
  open,
  collection,
  onClose,
  onSaved,
}: EditCollectionDialogProps) {
  const titleId = useId();
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(collection.name);
      setDescription(collection.description ?? "");
      setError(null);
      setLoading(false);
    }
  }, [open, collection]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClientInstance();
    const { data, error: updateError } = await updateCollection(supabase, {
      collectionId: collection.id,
      name,
      description,
    });

    setLoading(false);

    if (updateError) {
      setError(formatSupabaseError(updateError));
      return;
    }

    if (!data) {
      setError("Collection was not returned after update.");
      return;
    }

    onSaved(data);
    onClose();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-x-4 top-[12vh] z-50 mx-auto w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
            Edit collection
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5">
            <X className="size-5 text-zinc-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="collection-edit-name" className={formLabelClass}>
              Name
            </label>
            <input
              id="collection-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={formInputMdClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="collection-edit-desc" className={formLabelClass}>
              Description
            </label>
            <textarea
              id="collection-edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={formTextareaClass}
              placeholder="Optional description"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}