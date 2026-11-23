"use client";

import { Copy, Download, ExternalLink, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { SaveShortcutHint } from "@/lib/ui/save-shortcut-hint";
import {
  invokeFormSubmitHandler,
  useSaveKeyboardShortcut,
} from "@/lib/ui/use-save-keyboard-shortcut";

import { ItemMetadataFields } from "@/app/collections/[slug]/item-metadata-fields";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { dedupeTrimmedStrings } from "@/lib/supabase/dedupe-strings";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { getItemFileName } from "@/lib/supabase/items/item-labels";
import { itemThumbnailFitFromMetadata } from "@/lib/supabase/items/item-thumbnail-fit";
import {
  parseItemMetadata,
  serializeItemMetadata,
  type ItemMetadata,
} from "@/lib/supabase/metadata/schema";
import { setCollectionCoverImageUrl } from "@/lib/supabase/queries/collection-covers";
import {
  deleteCollectionItem,
  listUserItemMetadataRecords,
  updateCollectionItem,
} from "@/lib/supabase/queries/items";
import { triggerGoogleDriveDownload } from "@/lib/google/drive-url";
import type { Collection } from "@/lib/supabase/types/collection";
import type { Item } from "@/lib/supabase/types/item";
import { TagInput } from "@/lib/ui/tag-input";
import { useTagSuggestions } from "@/lib/ui/use-tag-suggestions";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

type ItemDetailModalProps = {
  item: Item | null;
  collection: Collection;
  collectionMetadata: import("@/lib/supabase/types/collection-metadata").CollectionMetadataRecord;
  suggestionItems: Item[];
  onClose: () => void;
  onUpdated: (item: Item) => void;
  onDeleted: (itemId: string) => void;
  onCollectionCoverSet?: (collection: Collection) => void;
};

export function ItemDetailModal({
  item,
  collection,
  collectionMetadata,
  suggestionItems,
  onClose,
  onUpdated,
  onDeleted,
  onCollectionCoverSet,
}: ItemDetailModalProps) {
  const titleId = useId();
  const [title, setTitle] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<ItemMetadata>({});
  const [userMetadataRecords, setUserMetadataRecords] = useState<
    Record<string, string>[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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

  const tagSuggestions = useTagSuggestions(open, suggestionSourceItems);

  const headerTitle = title.trim() || item?.title || "Untitled";
  const readOnlyFileName = useMemo(() => {
    if (!item) return "—";
  const fromMeta = getItemFileName(item);
    return fromMeta ?? metadata.file_name ?? "—";
  }, [item, metadata.file_name]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const supabase = createBrowserClientInstance();
      const { data } = await listUserItemMetadataRecords(supabase);
      setUserMetadataRecords(data ?? []);
    })();
  }, [open]);

  const initializedItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!item) {
      initializedItemIdRef.current = null;
      return;
    }
    if (initializedItemIdRef.current === item.id) {
      return;
    }
    initializedItemIdRef.current = item.id;
    setTitle(item.title);
    setDriveUrl(item.drive_url ?? "");
    setTags([...item.tags]);
    setMetadata(parseItemMetadata(item.metadata));
    setError(null);
    setLoading(false);
    setConfirmDelete(false);
    setLinkCopied(false);
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

  const handleSave = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!item) return;

      setError(null);
      setLoading(true);

      const supabase = createBrowserClientInstance();
      const { data, error: updateError } = await updateCollectionItem(
        supabase,
        {
          itemId: item.id,
          title,
          tags: dedupeTrimmedStrings(tags),
          metadata: serializeItemMetadata(metadata),
          driveUrl: driveUrl.trim() || null,
        },
      );

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
    },
    [driveUrl, item, metadata, onClose, onUpdated, tags, title],
  );

  const saveViaShortcut = useCallback(() => {
    invokeFormSubmitHandler(handleSave);
  }, [handleSave]);

  useSaveKeyboardShortcut(open, loading, saveViaShortcut);

  if (!open || !item) {
    return null;
  }

  const activeItem = item;
  const thumbnailFit = activeItem
    ? itemThumbnailFitFromMetadata(activeItem.metadata)
    : "fitted";
  const thumbnailIsPaper = thumbnailFit === "paper";

  async function copyDriveLink() {
    const value = driveUrl.trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1600);
    } catch {
      setError("Could not copy link.");
    }
  }

  async function handleSetAsCollectionCover() {
    if (!activeItem) return;
    setCoverLoading(true);
    setError(null);

    const supabase = createBrowserClientInstance();
    const { data, error: coverError } = await setCollectionCoverImageUrl(
      supabase,
      collection.id,
      activeItem.thumbnail_url,
    );

    setCoverLoading(false);

    if (coverError) {
      setError(formatSupabaseError(coverError));
      return;
    }

    if (data) {
      onCollectionCoverSet?.(data);
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
          <h2
            id={titleId}
            className="truncate text-lg font-semibold text-zinc-900"
          >
            {headerTitle}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5">
            <X className="size-5 text-zinc-700" />
          </button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSave}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div
              className={`relative aspect-[4/3] w-full ${
                thumbnailIsPaper ? "bg-zinc-100" : "bg-zinc-50"
              }`}
            >
              {thumbnailIsPaper ? (
                <Image
                  src={activeItem.thumbnail_url}
                  alt={activeItem.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 672px"
                  priority
                />
              ) : (
                <div className="absolute inset-0 p-3.5">
                  <div className="relative h-full w-full">
                    <Image
                      src={activeItem.thumbnail_url}
                      alt={activeItem.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 672px"
                      priority
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5 px-6 py-4">
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
              <span className={formLabelClass}>File name</span>
              <p className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2.5 font-mono text-sm text-zinc-900">
                {readOnlyFileName}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="detail-drive-url" className={formLabelClass}>
                Google Drive link
              </label>
              <div className="flex gap-2">
                <input
                  id="detail-drive-url"
                  type="url"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className={`min-w-0 flex-1 ${formInputMdClass}`}
                />
                <button
                  type="button"
                  onClick={() => void copyDriveLink()}
                  disabled={!driveUrl.trim()}
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                  title="Copy link"
                >
                  <Copy className="size-4" aria-hidden />
                  {linkCopied ? "Copied" : "Copy"}
                </button>
              </div>
              {driveUrl.trim() ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => triggerGoogleDriveDownload(driveUrl)}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    <Download className="size-4" aria-hidden />
                    Download Original
                  </button>
                  <a
                    href={driveUrl.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    Open in Drive
                  </a>
                </div>
              ) : null}
            </div>

            <TagInput
              id="detail-tags"
              label="Tags"
              value={tags}
              onChange={setTags}
              suggestions={tagSuggestions}
              disabled={loading}
            />

            <ItemMetadataFields
              value={metadata}
              onChange={setMetadata}
              collectionMetadata={collectionMetadata}
              suggestionItems={suggestionSourceItems}
              showFileName={false}
            />

              {error ? (
                <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-white px-6 py-4 sm:flex-row sm:flex-wrap">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? (
                "Saving…"
              ) : (
                <>
                  Save changes
                  <SaveShortcutHint />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleSetAsCollectionCover()}
              disabled={loading || coverLoading}
              className="h-11 rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            >
              {coverLoading ? "Setting cover…" : "Set as Collection Cover"}
            </button>

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
        </form>
      </div>
    </div>
  );
}