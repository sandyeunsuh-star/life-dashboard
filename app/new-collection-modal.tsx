"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { CollectionMetadataFields } from "@/app/collections/[slug]/collection-metadata-fields";
import { CollectionPaletteEditor } from "@/app/collections/collection-palette-editor";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { uploadCollectionCoverFromFile } from "@/lib/supabase/queries/collection-covers";
import {
  collectionMetadataInputToRecord,
  createCollection,
  listUserCollectionMetadataRecords,
} from "@/lib/supabase/queries/collections";
import { listUserItemMetadataRecords } from "@/lib/supabase/queries/items";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import type { CollectionMetadata } from "@/lib/supabase/metadata/collection-schema";
import {
  getMetadataSuggestionsFromMetadataRecords,
  mergeMetadataSuggestions,
} from "@/lib/supabase/metadata/suggestions";
import type { Collection } from "@/lib/supabase/types/collection";
import type { CollectionMetadataRecord } from "@/lib/supabase/types/collection-metadata";
import {
  formInputMdClass,
  formLabelClass,
  formTextareaClass,
} from "@/lib/ui/form-styles";
import { SaveShortcutHint } from "@/lib/ui/save-shortcut-hint";
import { useSaveKeyboardShortcut } from "@/lib/ui/use-save-keyboard-shortcut";

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
  const [albumMetadata, setAlbumMetadata] = useState<CollectionMetadata>({});
  const [collectionRecords, setCollectionRecords] = useState<
    CollectionMetadataRecord[]
  >([]);
  const [itemRecords, setItemRecords] = useState<Record<string, string>[]>([]);
  const [suggestionsReady, setSuggestionsReady] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const suggestions = useMemo(
    () =>
      mergeMetadataSuggestions(
        getMetadataSuggestionsFromMetadataRecords(collectionRecords),
        getMetadataSuggestionsFromMetadataRecords(itemRecords),
      ),
    [collectionRecords, itemRecords],
  );

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
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setAlbumMetadata({});
      setCoverFile(null);
      setCoverPreviewUrl(null);
      setError(null);
      setLoading(false);
      setSuggestionsReady(false);
      return;
    }

    void (async () => {
      const supabase = createBrowserClientInstance();
      const [collectionsRes, itemsRes] = await Promise.all([
        listUserCollectionMetadataRecords(supabase),
        listUserItemMetadataRecords(supabase),
      ]);
      setCollectionRecords(collectionsRes.data ?? []);
      setItemRecords(itemsRes.data ?? []);
      setSuggestionsReady(true);
    })();
  }, [open]);

  useSaveKeyboardShortcut(open, loading || !suggestionsReady, () => {
    formRef.current?.requestSubmit();
  });

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
      metadata: collectionMetadataInputToRecord(albumMetadata),
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

    let result = data;
    if (coverFile) {
      const { data: withCover, error: coverError } =
        await uploadCollectionCoverFromFile(supabase, data.id, coverFile);
      if (coverError) {
        setError(formatSupabaseError(coverError));
        onCreated?.(data);
        onClose();
        return;
      }
      if (withCover) {
        result = withCover;
      }
    }

    onCreated?.(result);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain p-4">
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
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-zinc-900"
            >
              New collection
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Set album metadata once — items inherit company, designer, and published.
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

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="flex flex-col gap-4">
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

          <div className="flex flex-col gap-2">
            <span className={formLabelClass}>Cover image (optional)</span>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                setCoverFile(file ?? null);
              }}
            />
            {coverPreviewUrl ? (
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-zinc-200">
                <Image
                  src={coverPreviewUrl}
                  alt="Cover preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="h-10 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              {coverFile ? "Choose different cover" : "Upload cover image"}
            </button>
          </div>

          {suggestionsReady ? (
            <>
              <CollectionMetadataFields
                value={albumMetadata}
                onChange={setAlbumMetadata}
                suggestions={suggestions}
                idPrefix="new-album"
              />
              <CollectionPaletteEditor
                value={albumMetadata.palette ?? []}
                onChange={(palette) =>
                  setAlbumMetadata({
                    ...albumMetadata,
                    palette: palette.length > 0 ? palette : undefined,
                  })
                }
                idPrefix="new-album"
              />
            </>
          ) : (
            <p className="text-sm text-zinc-600">Loading suggestions…</p>
          )}

          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            A URL slug is created from the name when you save (with a unique
            suffix if needed).
          </p>

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-wrap break-words">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !suggestionsReady}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? (
                "Creating…"
              ) : (
                <>
                  Create
                  <SaveShortcutHint />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}