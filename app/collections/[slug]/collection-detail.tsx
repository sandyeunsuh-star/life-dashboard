"use client";

import { CloudDownload, Pencil, Plus } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

import { AddItemDrawer } from "@/app/collections/[slug]/add-item-drawer";
import { CollectionFilterBar } from "@/app/collections/[slug]/collection-filter-bar";
import { EditCollectionDialog } from "@/app/collections/[slug]/edit-collection-dialog";
import { ImportGoogleDriveModal } from "@/app/collections/[slug]/import-google-drive-modal";
import { ItemDetailModal } from "@/app/collections/[slug]/item-detail-modal";
import {
  emptyItemFilters,
  filterCollectionItems,
} from "@/lib/supabase/items/filter-items";
import { parseItemMetadata } from "@/lib/supabase/metadata/schema";
import type { Collection } from "@/lib/supabase/types/collection";
import type { Item } from "@/lib/supabase/types/item";

type CollectionDetailProps = {
  collection: Collection;
  initialItems: Item[];
};

export function CollectionDetail({
  collection: initialCollection,
  initialItems,
}: CollectionDetailProps) {
  const [collection, setCollection] = useState(initialCollection);
  const [items, setItems] = useState(initialItems);
  const [filters, setFilters] = useState(emptyItemFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editCollectionOpen, setEditCollectionOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const filteredItems = useMemo(
    () => filterCollectionItems(items, filters),
    [items, filters],
  );

  return (
    <>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <button
            type="button"
            onClick={() => setEditCollectionOpen(true)}
            className="group max-w-2xl rounded-xl text-left transition hover:bg-zinc-100/80 -m-2 p-2"
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
              <p className="mt-3 text-lg leading-relaxed text-zinc-900">
                {collection.description}
              </p>
            ) : (
              <p className="mt-3 text-lg text-zinc-600 group-hover:text-zinc-900">
                No description yet. Click to add one.
              </p>
            )}
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
            >
              <CloudDownload className="size-4" aria-hidden />
              Import from Google Drive
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              <Plus className="size-4" aria-hidden />
              Add Item
            </button>
          </div>
        </div>

        <CollectionFilterBar
          items={items}
          filters={filters}
          filteredCount={filteredItems.length}
          onChange={setFilters}
          onClear={() => setFilters(emptyItemFilters)}
        />

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
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredItems.map((item) => {
              const meta = parseItemMetadata(item.metadata);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="w-full overflow-hidden rounded-xl border border-zinc-200/80 bg-white text-left shadow-sm transition hover:border-zinc-300 hover:shadow-md"
                  >
                    <div className="relative aspect-square bg-zinc-100">
                      <Image
                        src={item.thumbnail_url}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {item.title}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {meta.type ? (
                          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-900">
                            {meta.type}
                          </span>
                        ) : null}
                        {meta.published ? (
                          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-900">
                            {meta.published}
                          </span>
                        ) : null}
                      </div>
                      {item.tags.length > 0 ? (
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-700">
                          {item.tags.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <EditCollectionDialog
        open={editCollectionOpen}
        collection={collection}
        onClose={() => setEditCollectionOpen(false)}
        onSaved={setCollection}
      />

      <ItemDetailModal
        item={selectedItem}
        collectionName={collection.name}
        suggestionItems={items}
        onClose={() => setSelectedItem(null)}
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
        suggestionItems={items}
        onClose={() => setDrawerOpen(false)}
        onCreated={(item) => {
          setItems((prev) => [item, ...prev]);
        }}
      />

      <ImportGoogleDriveModal
        open={importOpen}
        collectionId={collection.id}
        collectionSlug={collection.slug}
        collectionName={collection.name}
        suggestionItems={items}
        onClose={() => setImportOpen(false)}
        onImported={(imported) => {
          if (imported.length > 0) {
            setItems((prev) => [...imported, ...prev]);
          }
        }}
      />
    </>
  );
}