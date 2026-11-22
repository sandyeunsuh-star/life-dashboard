"use client";

import { ExternalLink, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";

import { ItemMetadataFields } from "@/app/collections/[slug]/item-metadata-fields";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { parseTagsInput } from "@/lib/supabase/filename";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  parseItemMetadata,
  serializeItemMetadata,
  type ItemMetadata,
} from "@/lib/supabase/metadata/schema";
import {
  deleteCollectionItem,
  listUserItemMetadataRecords,
  updateCollectionItem,
} from "@/lib/supabase/queries/items";
import type { Item } from "@/lib/supabase/types/item";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

type ItemDetailModalProps = {
  item: Item | null;
  collectionName: string;
  suggestionItems: Item[];
  onClose: () => void;
  onUpdated: (item: Item) => void;
  onDeleted: (itemId: string) => void;
};

export function ItemDetailModal({
  item,
  collectionName,
  suggestionItems,
  onClose,
  onUpdated,
  onDeleted,
}: ItemDetailModalProps) {
  const titleId = useId();
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [metadata, setMetadata] = useState<ItemMetadata>({});
  const [userMetadataRecords, setUserMetadataRecords] = useState<
    Record<string, string>[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const open = item !== null;

  const suggestionSourceItems = useMemo(
    () => [
      ...suggestionItems,
      ...userMetadataRecords.map(
        (row, index) =>
          ({
            id: `meta-suggest-${index}`,
            metadata: row,
            tags: [],
          }) as unknown as Item,
      ),
    ],
    [suggestionItems, userMetadataRecords],
  );

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const supabase = createBrowserClientInstance();
      const { data } = await listUserItemMetadataRecords(supabase);
      setUserMetadataRecords(data ?? []);
    })();
  }, [open]);

  useEffect(() => {
    if (!item) {
      return;
    }
    setTitle(item.title);
    setTagsInput(item.tags.join(", "));
    setMetadata(parseItemMetadata(item.metadata));
    setError(null);
    setLoading(false);
    setConfirmDelete(false);
  }, [item]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onClose]);

  if (!open || !item) {
    return null;
  }

  const activeItem = item;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClientInstance();
    const { data, error: updateError } = await updateCollectionItem(supabase, {
      itemId: activeItem.id,
      title,
      tags: parseTagsInput(tagsInput),
      metadata: serializeItemMetadata({
        ...metadata,
        collection: collectionName,
      }),
    });

    setLoading(false);

    if (updateError) {
      setError(formatSupabaseError(updateError));
      return;
    }

    if (!data) {
      setError("Item was not returned after update.");
      return;
    }

    onUpdated(data);
    onClose();
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createBrowserClientInstance();
    const { error: deleteError } = await deleteCollectionItem(
      supabase,
      activeItem.id,
    );

    setLoading(false);

    if (deleteError) {
      setError(formatSupabaseError(deleteError));
      setConfirmDelete(false);
      return;
    }

    onDeleted(activeItem.id);
    onClose();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-x-4 top-[4vh] z-50 mx-auto flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
            Item details
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5">
            <X className="size-5 text-zinc-700" />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          <div className="relative aspect-[4/3] w-full bg-zinc-100">
            <Image
              src={activeItem.thumbnail_url}
              alt={activeItem.title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 672px"
              priority
            />
          </div>

          <div className="flex flex-col gap-5 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="detail-title" className={formLabelClass}>
                Title
              </label>
              <input
                id="detail-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={formInputMdClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="detail-tags" className={formLabelClass}>
                Tags
              </label>
              <input
                id="detail-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="floral, vintage"
                className={formInputMdClass}
              />
            </div>

            <ItemMetadataFields
              value={metadata}
              onChange={setMetadata}
              collectionName={collectionName}
              suggestionItems={suggestionSourceItems}
              showFileName
            />

            {error ? (
              <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:flex-wrap">
              <button
                type="submit"
                disabled={loading}
                className="h-11 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white disabled:opacity-60"
              >
                {loading ? "Saving…" : "Save changes"}
              </button>

              {activeItem.drive_url ? (
                <a
                  href={activeItem.drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  <ExternalLink className="size-4" />
                  Open original in Google Drive
                </a>
              ) : null}

              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium disabled:opacity-60 ${
                  confirmDelete
                    ? "bg-red-600 text-white"
                    : "border border-red-200 bg-red-50 text-red-800"
                }`}
              >
                <Trash2 className="size-4" />
                {confirmDelete ? "Confirm delete" : "Delete item"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}