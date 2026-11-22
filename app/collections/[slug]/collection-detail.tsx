"use client";

import { Check, CloudDownload, Info, Pencil, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { AddItemDrawer } from "@/app/collections/[slug]/add-item-drawer";
import { BulkEditItemsModal } from "@/app/collections/[slug]/bulk-edit-items-modal";
import { CollectionFilterBar } from "@/app/collections/[slug]/collection-filter-bar";
import { CollectionMetadataBadges } from "@/app/collections/[slug]/collection-metadata-badges";
import { OpenDriveFolderLink } from "@/app/collections/open-drive-folder-link";
import { CollectionPaletteStrip } from "@/app/collections/collection-palette-strip";
import { DriveQuickDownloadButton } from "@/lib/ui/drive-quick-download-button";
import { EditCollectionDialog } from "@/app/collections/[slug]/edit-collection-dialog";
import { EditCollectionMetadataDialog } from "@/app/collections/[slug]/edit-collection-metadata-dialog";
import { ImportGoogleDriveModal } from "@/app/collections/[slug]/import-google-drive-modal";
import { ItemDetailModal } from "@/app/collections/[slug]/item-detail-modal";
import { CollectionItemsList } from "@/app/collections/[slug]/collection-items-list";
import { CollectionCoverArt } from "@/app/collections/collection-cover-art";
import { ChangeCollectionCoverButton } from "@/app/collections/change-collection-cover-button";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  emptyItemFilters,
  filterCollectionItems,
  toggleTagInFilters,
} from "@/lib/supabase/items/filter-items";
import {
  bulkCleanItemTitles,
  deleteCollectionItems,
} from "@/lib/supabase/queries/items";
import { parseCollectionMetadata } from "@/lib/supabase/metadata/collection-schema";
import type { Collection } from "@/lib/supabase/types/collection";
import type { CollectionMetadataRecord } from "@/lib/supabase/types/collection-metadata";
import type { Item } from "@/lib/supabase/types/item";
import {
  useViewLayoutPreference,
  VIEW_LAYOUT_STORAGE,
} from "@/lib/ui/view-layout";

type CollectionDetailProps = {
  collection: Collection;
  initialItems: Item[];
};

function collectionMetadataRecord(
  collection: Collection,
): CollectionMetadataRecord {
  return (collection.metadata ?? {}) as CollectionMetadataRecord;
}

const COLLECTION_HEADER_BTN =
  "inline-flex items-center justify-center gap-1.5 h-8 shrink-0 px-3 rounded-lg text-xs font-medium transition";
const COLLECTION_HEADER_BTN_SECONDARY = `${COLLECTION_HEADER_BTN} border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50`;
const COLLECTION_HEADER_BTN_PRIMARY = `${COLLECTION_HEADER_BTN} border border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800`;

export function CollectionDetail({
  collection: initialCollection,
  initialItems,
}: CollectionDetailProps) {
  const router = useRouter();
  const [collection, setCollection] = useState(initialCollection);
  const albumMetadata = collectionMetadataRecord(collection);
  const albumMeta = parseCollectionMetadata(albumMetadata);

  const [items, setItems] = useState(initialItems);
  const [filters, setFilters] = useState(emptyItemFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editCollectionOpen, setEditCollectionOpen] = useState(false);
  const [editMetadataOpen, setEditMetadataOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [cleanTitlesLoading, setCleanTitlesLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [cleanTitlesToast, setCleanTitlesToast] = useState<string | null>(
    null,
  );

  const lastClickedIndexRef = useRef<number | null>(null);
  const [itemViewLayout, setItemViewLayout] = useViewLayoutPreference(
    VIEW_LAYOUT_STORAGE.items,
  );

  const previewThumbnails = useMemo(
    () => items.slice(0, 4).map((item) => item.thumbnail_url),
    [items],
  );

  const filteredItems = useMemo(
    () => filterCollectionItems(items, filters, albumMetadata),
    [items, filters, albumMetadata],
  );

  const allFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.has(item.id));

  const selectionActive = selectedIds.size > 0;

  const toggleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredItems.map((item) => item.id)));
  }, [allFilteredSelected, filteredItems]);

  const toggleTagFilter = useCallback((tag: string) => {
    setFilters((prev) => toggleTagInFilters(prev, tag));
  }, []);

  const handleCardSelect = useCallback(
    (item: Item, index: number, shiftKey: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);

        if (
          shiftKey &&
          lastClickedIndexRef.current !== null &&
          filteredItems.length > 0
        ) {
          const start = Math.min(lastClickedIndexRef.current, index);
          const end = Math.max(lastClickedIndexRef.current, index);
          for (let i = start; i <= end; i += 1) {
            const id = filteredItems[i]?.id;
            if (id) next.add(id);
          }
        } else if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }

        return next;
      });
      lastClickedIndexRef.current = index;
    },
    [filteredItems],
  );

  async function handleCleanSelectedTitles() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setCleanTitlesLoading(true);
    setBulkError(null);

    const supabase = createBrowserClientInstance();
    const { data, cleanedCount, error } = await bulkCleanItemTitles(supabase, {
      itemIds: ids,
      context: {
        collectionName: collection.name,
        company: albumMeta.company,
      },
    });

    setCleanTitlesLoading(false);

    if (error) {
      setBulkError(formatSupabaseError(error));
      return;
    }

    if (data && data.length > 0) {
      setItems((prev) => {
        const byId = new Map(data.map((item) => [item.id, item]));
        return prev.map((item) => byId.get(item.id) ?? item);
      });
    }

    const count = cleanedCount ?? data?.length ?? 0;
    setCleanTitlesToast(
      count > 0
        ? `Cleaned ${count} title${count === 1 ? "" : "s"}`
        : "No titles needed cleaning",
    );
    window.setTimeout(() => setCleanTitlesToast(null), 2800);
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${ids.length} item${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setBulkDeleteLoading(true);
    setBulkError(null);

    const supabase = createBrowserClientInstance();
    const { error } = await deleteCollectionItems(supabase, ids);

    setBulkDeleteLoading(false);

    if (error) {
      setBulkError(formatSupabaseError(error));
      return;
    }

    setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
    if (selectedItem && selectedIds.has(selectedItem.id)) {
      setSelectedItem(null);
    }
  }

  return (
    <>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 pb-28">
        <div className="flex min-w-0 gap-4">
            <div className="group relative hidden h-28 w-40 shrink-0 overflow-hidden rounded-xl border border-zinc-200 shadow-sm sm:block">
              <div className="absolute inset-0">
                <CollectionCoverArt
                  coverImageUrl={collection.cover_image_url}
                  previewThumbnails={previewThumbnails}
                  alt={`${collection.name} cover`}
                  aspectClass="h-full w-full"
                  className="h-full w-full"
                />
              </div>
              <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-zinc-900/50 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                <ChangeCollectionCoverButton
                  collection={collection}
                  onUpdated={setCollection}
                  variant="overlay"
                  label="Change cover"
                />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setEditCollectionOpen(true)}
                className="group rounded-xl text-left transition hover:bg-zinc-100/80 -m-2 p-2"
              >
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                    {collection.name}
                  </h1>
                  <Pencil
                    className="size-4 text-zinc-500 opacity-0 transition group-hover:opacity-100"
                    aria-hidden
                  />
                </div>
                {collection.description ? (
                  <p className="mt-3 w-full text-sm leading-relaxed text-zinc-600">
                    {collection.description}
                  </p>
                ) : (
                  <p className="mt-3 w-full text-sm leading-relaxed text-zinc-600 group-hover:text-zinc-700">
                    No description yet. Click to add one.
                  </p>
                )}
              </button>

              <CollectionMetadataBadges
                metadata={albumMetadata}
                className="mt-3"
              />

              <div className="mt-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <OpenDriveFolderLink
                    metadata={albumMetadata}
                    className={COLLECTION_HEADER_BTN_SECONDARY}
                  />
                  <button
                    type="button"
                    onClick={() => setEditMetadataOpen(true)}
                    className={COLLECTION_HEADER_BTN_SECONDARY}
                  >
                    <Info className="size-3.5" aria-hidden />
                    Collection info
                  </button>
                  <ChangeCollectionCoverButton
                    collection={collection}
                    onUpdated={setCollection}
                    variant="button"
                    label="Change cover"
                    className={COLLECTION_HEADER_BTN_SECONDARY}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImportOpen(true)}
                    className={COLLECTION_HEADER_BTN_SECONDARY}
                  >
                    <CloudDownload className="size-3.5" aria-hidden />
                    Import from Google Drive
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className={COLLECTION_HEADER_BTN_PRIMARY}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Add Item
                  </button>
                </div>
              </div>
            </div>
        </div>

        {albumMeta.palette && albumMeta.palette.length > 0 ? (
          <CollectionPaletteStrip
            palette={albumMeta.palette}
            className="mt-6 w-full"
          />
        ) : null}

        <CollectionFilterBar
          items={items}
          collectionMetadata={albumMetadata}
          filters={filters}
          filteredCount={filteredItems.length}
          viewLayout={itemViewLayout}
          onViewLayoutChange={setItemViewLayout}
          onChange={setFilters}
          onClear={() => setFilters(emptyItemFilters)}
        />

        {filteredItems.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-sm font-medium text-zinc-900 underline"
            >
              {allFilteredSelected ? "Deselect all" : "Select all"}
            </button>
            {selectionActive ? (
              <span className="text-sm text-zinc-700">
                {selectedIds.size} selected
              </span>
            ) : null}
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
            <p className="text-sm font-medium text-zinc-900">No items yet</p>
            <p className="mt-1 text-sm text-zinc-700">
              Add your first item with a thumbnail and Drive link.
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-900">
              No items match your filters
            </p>
            <button
              type="button"
              onClick={() => setFilters(emptyItemFilters)}
              className="mt-3 text-sm font-medium text-zinc-900 underline"
            >
              Clear filters
            </button>
          </div>
        ) : itemViewLayout === "list" ? (
          <CollectionItemsList
            items={filteredItems}
            selectedIds={selectedIds}
            selectionActive={selectionActive}
            activeFilterTags={filters.tags}
            onToggleFilterTag={toggleTagFilter}
            onToggleSelect={handleCardSelect}
            onOpenItem={setSelectedItem}
          />
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredItems.map((item, index) => {
              const isSelected = selectedIds.has(item.id);

              return (
                <li key={item.id} className="group relative">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      if (e.shiftKey || selectionActive) {
                        handleCardSelect(item, index, e.shiftKey);
                        return;
                      }
                      setSelectedItem(item);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      if (e.shiftKey || selectionActive) {
                        handleCardSelect(item, index, e.shiftKey);
                        return;
                      }
                      setSelectedItem(item);
                    }}
                    className={`w-full cursor-pointer overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 ${
                      isSelected
                        ? "border-zinc-900 ring-2 ring-zinc-900/20"
                        : "border-zinc-200/80 hover:border-zinc-300"
                    }`}
                  >
                    <div className="relative aspect-square bg-zinc-100">
                      <Image
                        src={item.thumbnail_url}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                      <div
                        className={`absolute left-2 top-2 z-20 transition ${
                          selectionActive
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <button
                          type="button"
                          aria-label={
                            isSelected ? "Deselect item" : "Select item"
                          }
                          aria-pressed={isSelected}
                          className={`relative z-20 flex size-6 items-center justify-center rounded-md border shadow-sm ${
                            isSelected
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-zinc-300 bg-white text-zinc-900"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleCardSelect(item, index, e.shiftKey);
                          }}
                        >
                          {isSelected ? (
                            <Check className="size-3.5" strokeWidth={3} />
                          ) : null}
                        </button>
                      </div>
                      <div
                        className={`absolute right-2 top-2 z-20 transition ${
                          selectionActive
                            ? "opacity-0"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <DriveQuickDownloadButton
                          driveUrl={item.drive_url}
                          className="relative z-20"
                        />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {item.title}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {bulkError ? (
          <p className="mt-4 text-sm text-red-700">{bulkError}</p>
        ) : null}
      </main>

      {cleanTitlesToast ? (
        <div
          className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-zinc-200 bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
          role="status"
        >
          {cleanTitlesToast}
        </div>
      ) : null}

      {selectionActive ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-6 py-4 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-zinc-900">
              {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBulkEditOpen(true)}
                className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Bulk Edit Info
              </button>
              <button
                type="button"
                onClick={() => void handleCleanSelectedTitles()}
                disabled={cleanTitlesLoading}
                className="h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
              >
                {cleanTitlesLoading ? "Cleaning…" : "Clean Titles"}
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteSelected()}
                disabled={bulkDeleteLoading}
                className="h-10 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-800 disabled:opacity-60"
              >
                {bulkDeleteLoading ? "Deleting…" : "Delete Selected"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900"
              >
                Clear selection
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <EditCollectionDialog
        open={editCollectionOpen}
        collection={collection}
        onClose={() => setEditCollectionOpen(false)}
        onSaved={setCollection}
      />

      <EditCollectionMetadataDialog
        open={editMetadataOpen}
        collection={collection}
        onClose={() => setEditMetadataOpen(false)}
        onSaved={(updated) => {
          setCollection(updated);
          router.refresh();
        }}
      />

      <BulkEditItemsModal
        open={bulkEditOpen}
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        suggestionItems={items}
        onClose={() => setBulkEditOpen(false)}
        onSaved={(updated) => {
          setItems((prev) => {
            const byId = new Map(updated.map((item) => [item.id, item]));
            return prev.map((item) => byId.get(item.id) ?? item);
          });
        }}
      />

      <ItemDetailModal
        item={selectedItem}
        collection={collection}
        collectionMetadata={albumMetadata}
        suggestionItems={items}
        onClose={() => setSelectedItem(null)}
        onCollectionCoverSet={setCollection}
        onUpdated={(updated) => {
          setItems((prev) =>
            prev.map((entry) => (entry.id === updated.id ? updated : entry)),
          );
        }}
        onDeleted={(itemId) => {
          setItems((prev) => prev.filter((entry) => entry.id !== itemId));
        }}
      />

      <AddItemDrawer
        open={drawerOpen}
        collectionId={collection.id}
        collectionName={collection.name}
        collectionMetadata={albumMetadata}
        suggestionItems={items}
        onClose={() => setDrawerOpen(false)}
        onCreated={(item) => {
          setItems((prev) => [item, ...prev]);
        }}
      />

      <ImportGoogleDriveModal
        open={importOpen}
        collection={collection}
        collectionSlug={collection.slug}
        collectionName={collection.name}
        collectionMetadata={albumMetadata}
        suggestionItems={items}
        onClose={() => setImportOpen(false)}
        onCollectionUpdated={setCollection}
        onImported={(imported, updated) => {
          setItems((prev) => {
            let next = prev;
            if (updated && updated.length > 0) {
              const byId = new Map(updated.map((item) => [item.id, item]));
              next = next.map((item) => byId.get(item.id) ?? item);
            }
            if (imported.length > 0) {
              next = [...imported, ...next];
            }
            return next;
          });
        }}
      />
    </>
  );
}