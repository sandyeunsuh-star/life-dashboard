"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { SaveShortcutHint } from "@/lib/ui/save-shortcut-hint";
import { useSaveKeyboardShortcut } from "@/lib/ui/use-save-keyboard-shortcut";

import { CollectionMetadataFields } from "@/app/collections/[slug]/collection-metadata-fields";
import { CollectionPaletteEditor } from "@/app/collections/collection-palette-editor";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  parseCollectionMetadata,
  type CollectionMetadata,
} from "@/lib/supabase/metadata/collection-schema";
import {
  getMetadataSuggestionsFromMetadataRecords,
  mergeMetadataSuggestions,
} from "@/lib/supabase/metadata/suggestions";
import {
  collectionMetadataInputToRecord,
  listUserCollectionMetadataRecords,
  updateCollectionMetadata,
} from "@/lib/supabase/queries/collections";
import { listUserItemMetadataRecords } from "@/lib/supabase/queries/items";
import type { Collection } from "@/lib/supabase/types/collection";
import type { CollectionMetadataRecord } from "@/lib/supabase/types/collection-metadata";
import { useFormWhenModalOpens } from "@/lib/ui/use-form-when-modal-opens";

type EditCollectionMetadataDialogProps = {
  open: boolean;
  collection: Collection;
  onClose: () => void;
  onSaved: (collection: Collection) => void;
};

export function EditCollectionMetadataDialog({
  open,
  collection,
  onClose,
  onSaved,
}: EditCollectionMetadataDialogProps) {
  const titleId = useId();
  const [metadata, setMetadata] = useState<CollectionMetadata>({});
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [collectionRecords, setCollectionRecords] = useState<
    CollectionMetadataRecord[]
  >([]);
  const [itemRecords, setItemRecords] = useState<
    Record<string, string>[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const collectionRef = useRef(collection);
  collectionRef.current = collection;

  const syncFormFromCollection = useCallback(() => {
    setMetadata(parseCollectionMetadata(collectionRef.current.metadata));
    setError(null);
    setLoading(false);
  }, []);

  useFormWhenModalOpens(open, collection.id, syncFormFromCollection);

  const suggestions = useMemo(
    () =>
      mergeMetadataSuggestions(
        getMetadataSuggestionsFromMetadataRecords(collectionRecords),
        getMetadataSuggestionsFromMetadataRecords(itemRecords),
      ),
    [collectionRecords, itemRecords],
  );

  useEffect(() => {
    if (!open) {
      setSuggestionsLoaded(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const supabase = createBrowserClientInstance();
      const [collectionsRes, itemsRes] = await Promise.all([
        listUserCollectionMetadataRecords(supabase),
        listUserItemMetadataRecords(supabase),
      ]);
      if (cancelled) return;
      setCollectionRecords(collectionsRes.data ?? []);
      setItemRecords(itemsRes.data ?? []);
      setSuggestionsLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useSaveKeyboardShortcut(open, loading || !suggestionsLoaded, () => {
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
    const { data, error: updateError } = await updateCollectionMetadata(
      supabase,
      {
        collectionId: collection.id,
        metadata: collectionMetadataInputToRecord(metadata, collection.metadata),
      },
    );

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
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
              Collection info
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Album metadata for <strong className="text-zinc-900">{collection.name}</strong> — inherited by all items unless overridden.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5">
            <X className="size-5 text-zinc-600" />
          </button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="flex flex-col gap-4">
              {suggestionsLoaded ? (
                <>
                  <CollectionMetadataFields
                    value={metadata}
                    onChange={setMetadata}
                    suggestions={suggestions}
                    idPrefix="edit-album"
                  />
                  <CollectionPaletteEditor
                    value={metadata.palette ?? []}
                    onChange={(palette) =>
                      setMetadata({
                        ...metadata,
                        palette: palette.length > 0 ? palette : undefined,
                      })
                    }
                    idPrefix="edit-album"
                  />
                </>
              ) : (
                <p className="text-sm text-zinc-600">Loading suggestions…</p>
              )}

              {error ? (
                <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !suggestionsLoaded}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? (
                "Saving…"
              ) : (
                <>
                  Save info
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