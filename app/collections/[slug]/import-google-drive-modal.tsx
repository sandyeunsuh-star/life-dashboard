"use client";

import { CloudDownload, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { ItemMetadataFields } from "@/app/collections/[slug]/item-metadata-fields";
import { dedupeTrimmedStrings } from "@/lib/supabase/dedupe-strings";
import {
  syncDriveFolderToCollection,
  type SyncProgressInfo,
} from "@/lib/supabase/google-drive/sync-folder";
import { parseCollectionMetadata } from "@/lib/supabase/metadata/collection-schema";
import {
  defaultTrackBatchMetadata,
  type ItemMetadata,
} from "@/lib/supabase/metadata/schema";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { saveCollectionDriveFolderUrl } from "@/lib/supabase/queries/collection-drive-folder";
import { listUserItemMetadataRecords } from "@/lib/supabase/queries/items";
import type { Collection } from "@/lib/supabase/types/collection";
import type { Item } from "@/lib/supabase/types/item";
import { TagInput } from "@/lib/ui/tag-input";
import { useTagSuggestions } from "@/lib/ui/use-tag-suggestions";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

type ImportGoogleDriveModalProps = {
  open: boolean;
  collection: Collection;
  collectionSlug: string;
  collectionName: string;
  collectionMetadata: import("@/lib/supabase/types/collection-metadata").CollectionMetadataRecord;
  suggestionItems: Item[];
  onClose: () => void;
  onImported?: (imported: Item[], updated?: Item[]) => void;
  onCollectionUpdated?: (collection: Collection) => void;
};

export function ImportGoogleDriveModal({
  open,
  collection,
  collectionSlug,
  collectionName,
  collectionMetadata,
  suggestionItems,
  onClose,
  onImported,
  onCollectionUpdated,
}: ImportGoogleDriveModalProps) {
  const collectionId = collection.id;
  const titleId = useId();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [folderUrl, setFolderUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [batchMetadata, setBatchMetadata] = useState<ItemMetadata>(() =>
    defaultTrackBatchMetadata(),
  );
  const [userMetadataRecords, setUserMetadataRecords] = useState<
    Record<string, string>[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<SyncProgressInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const suggestionSourceItems = useMemo(
    () => [
      ...suggestionItems,
      ...userMetadataRecords.map(
        (metadata, index) =>
          ({
            id: `meta-${index}`,
            metadata,
            tags: [],
          }) as unknown as Item,
      ),
    ],
    [suggestionItems, userMetadataRecords],
  );

  const tagSuggestions = useTagSuggestions(open, suggestionSourceItems);

  useEffect(() => {
    if (!open) return;

    async function loadStatus() {
      const response = await fetch("/api/google-drive/status");
      if (!response.ok) {
        setConnected(false);
        return;
      }
      const body = (await response.json()) as { connected: boolean };
      setConnected(body.connected);
    }

    async function loadUserMetadata() {
      const supabase = createBrowserClientInstance();
      const { data } = await listUserItemMetadataRecords(supabase);
      setUserMetadataRecords(data ?? []);
    }

    void loadStatus();
    void loadUserMetadata();
  }, [open]);

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

  useEffect(() => {
    if (!open) {
      setFolderUrl("");
      setTags([]);
      setBatchMetadata(defaultTrackBatchMetadata());
      setError(null);
      setProgress(null);
      setLoading(false);
      setConnected(null);
    }
  }, [open, collectionName]);

  function connectGoogleDrive() {
    const returnTo = `/collections/${collectionSlug}`;
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  }

  async function handleSync(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setProgress(null);

    try {
      const album = parseCollectionMetadata(collectionMetadata);
      const result = await syncDriveFolderToCollection({
        collectionId,
        collectionName,
        company: album.company,
        folderUrl,
        tags: dedupeTrimmedStrings(tags),
        batchMetadata,
        onProgress: setProgress,
      });

      const trimmedFolder = folderUrl.trim();
      if (trimmedFolder) {
        const supabase = createBrowserClientInstance();
        const { data: updatedCollection } = await saveCollectionDriveFolderUrl(
          supabase,
          collectionId,
          collection.metadata,
          trimmedFolder,
        );
        if (updatedCollection) {
          onCollectionUpdated?.(updatedCollection);
        }
      }

      if (
        result.errors.length > 0 &&
        result.imported.length === 0 &&
        result.updated.length === 0
      ) {
        setError(result.errors.join("\n"));
        return;
      }

      onImported?.(result.imported, result.updated);

      if (result.errors.length > 0) {
        setError(
          `Imported ${result.imported.length} item(s). ${result.failed} failed:\n${result.errors.join("\n")}`,
        );
        return;
      }

      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close modal"
        className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={loading ? undefined : onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-x-4 top-[8vh] z-50 mx-auto flex max-h-[84vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:inset-x-auto"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-zinc-900"
            >
              Import from Google Drive
            </h2>
            <p className="mt-1 text-sm text-zinc-700">
              Sync images from a folder — only WebP thumbnails are stored.
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-600 disabled:opacity-40"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form
          onSubmit={handleSync}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5"
        >
          {connected === null ? (
            <p className="text-sm text-zinc-700">Checking Google Drive…</p>
          ) : null}

          {connected === false ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-zinc-900">
                Connect Google Drive
              </p>
              <button
                type="button"
                onClick={connectGoogleDrive}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white"
              >
                <CloudDownload className="size-4" aria-hidden />
                Connect Google Drive
              </button>
            </div>
          ) : null}

          {connected ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="drive-folder" className={formLabelClass}>
                  Folder link
                </label>
                <input
                  id="drive-folder"
                  value={folderUrl}
                  onChange={(e) => setFolderUrl(e.target.value)}
                  required
                  placeholder="https://drive.google.com/drive/folders/..."
                  className={formInputMdClass}
                />
              </div>

              <TagInput
                id="import-tags"
                label="Default tags"
                value={tags}
                onChange={setTags}
                suggestions={tagSuggestions}
                disabled={loading}
                placeholder="Applied to every imported item…"
              />

              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900">
                Kit metadata (company, designer, published) comes from this collection’s album info.
              </p>

              <ItemMetadataFields
                value={batchMetadata}
                onChange={setBatchMetadata}
                collectionMetadata={collectionMetadata}
                suggestionItems={suggestionSourceItems}
                showOverrides={false}
              />
            </div>
          ) : null}

          {progress ? (
            <p className="mt-4 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-900">
              {progress.phase === "listing"
                ? "Listing folder…"
                : progress.phase === "importing"
                  ? `Importing ${progress.current} / ${progress.total}${progress.fileName ? ` — ${progress.fileName}` : ""}`
                  : `Done — ${progress.imported} imported, ${progress.skipped} skipped, ${progress.failed} failed.`}
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm text-red-700 whitespace-pre-wrap">{error}</p>
          ) : null}

          {connected ? (
            <div className="mt-6 flex gap-2 border-t border-zinc-100 pt-5">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="h-11 flex-1 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="h-11 flex-1 rounded-lg bg-zinc-900 text-sm font-medium text-white disabled:opacity-60"
              >
                {loading ? "Syncing…" : "Sync folder"}
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </>
  );
}