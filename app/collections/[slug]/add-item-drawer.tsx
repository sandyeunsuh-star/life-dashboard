"use client";

import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { ItemMetadataFields } from "@/app/collections/[slug]/item-metadata-fields";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { dedupeTrimmedStrings } from "@/lib/supabase/dedupe-strings";
import {
  defaultTrackBatchMetadata,
  metadataForNewUpload,
  serializeItemMetadata,
  type ItemMetadata,
} from "@/lib/supabase/metadata/schema";
import { guessItemTitleFromFileName } from "@/lib/supabase/metadata/title-from-filename";
import { createCollectionItem } from "@/lib/supabase/queries/items";
import type { Item } from "@/lib/supabase/types/item";
import { TagInput } from "@/lib/ui/tag-input";
import { useTagSuggestions } from "@/lib/ui/use-tag-suggestions";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";
import { SaveShortcutHint } from "@/lib/ui/save-shortcut-hint";
import { useSaveKeyboardShortcut } from "@/lib/ui/use-save-keyboard-shortcut";

type AddItemDrawerProps = {
  open: boolean;
  collectionId: string;
  collectionName: string;
  collectionMetadata: import("@/lib/supabase/types/collection-metadata").CollectionMetadataRecord;
  suggestionItems: Item[];
  onClose: () => void;
  onCreated?: (item: Item) => void;
};

export function AddItemDrawer({
  open,
  collectionId,
  collectionName,
  collectionMetadata,
  suggestionItems,
  onClose,
  onCreated,
}: AddItemDrawerProps) {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const tagSuggestions = useTagSuggestions(open, suggestionItems);
  const [batchMetadata, setBatchMetadata] = useState<ItemMetadata>(() =>
    defaultTrackBatchMetadata(),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useSaveKeyboardShortcut(open, loading, () => {
    formRef.current?.requestSubmit();
  });

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
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  useEffect(() => {
    if (!open) {
      setImageFile(null);
      setPreviewUrl(null);
      setTitle("");
      setDriveUrl("");
      setTags([]);
      setBatchMetadata(defaultTrackBatchMetadata());
      setError(null);
      setLoading(false);
    }
  }, [open, collectionName]);

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setImageFile(file);
    const { title: guessed } = guessItemTitleFromFileName(
      file.name,
      collectionName,
    );
    setTitle(guessed);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!imageFile) {
      setError("Choose an image file to upload.");
      return;
    }

    setLoading(true);

    const metadata = serializeItemMetadata(
      metadataForNewUpload(imageFile.name, batchMetadata),
    );

    const supabase = createBrowserClientInstance();
    const { data, error: createError } = await createCollectionItem(supabase, {
      collectionId,
      imageFile,
      title,
      driveUrl: driveUrl.trim() || undefined,
      tags: dedupeTrimmedStrings(tags),
      metadata,
    });

    setLoading(false);

    if (createError) {
      setError(formatSupabaseError(createError));
      return;
    }

    if (!data) {
      setError(
        formatSupabaseError({
          message: "Item was not returned after insert.",
          code: "PGRST116",
        }),
      );
      return;
    }

    onCreated?.(data);
    onClose();
  }

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close drawer"
        className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-zinc-900"
            >
              Add item
            </h2>
            <p className="mt-1 text-sm text-zinc-700">
              Upload a lightweight thumbnail only — masters stay in Drive.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className={formLabelClass}>Image</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileSelected}
              />
              <div
                className={`overflow-hidden rounded-xl border border-dashed ${
                  previewUrl ? "border-zinc-300" : "border-zinc-300"
                } bg-zinc-50`}
              >
                {previewUrl ? (
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={previewUrl}
                      alt="Selected preview"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 px-4 text-center">
                    <ImagePlus className="size-8 text-zinc-400" aria-hidden />
                    <p className="text-sm text-zinc-700">No image selected</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-10 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Choose file
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="item-title" className={formLabelClass}>
                Title
              </label>
              <input
                id="item-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className={formInputMdClass}
                placeholder="Item title"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="drive-url" className={formLabelClass}>
                Google Drive link
                <span className="font-normal text-zinc-500"> (optional)</span>
              </label>
              <input
                id="drive-url"
                type="url"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                className={formInputMdClass}
                placeholder="https://drive.google.com/..."
              />
            </div>

            <TagInput
              id="add-item-tags"
              label="Tags"
              value={tags}
              onChange={setTags}
              suggestions={tagSuggestions}
              placeholder="Type and press Enter…"
            />

            <ItemMetadataFields
              value={batchMetadata}
              onChange={setBatchMetadata}
              collectionMetadata={collectionMetadata}
              suggestionItems={suggestionItems}
              showOverrides={false}
            />
          </div>

          {error ? (
            <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-wrap break-words">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex gap-2 border-t border-zinc-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? (
                "Saving…"
              ) : (
                <>
                  Add item
                  <SaveShortcutHint />
                </>
              )}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}