"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { CollectionsFilterBar } from "@/app/collections/collections-filter-bar";
import {
  emptyCollectionFilters,
  filterCollections,
} from "@/lib/supabase/collections/filter-collections";

import { EditCollectionMetadataDialog } from "@/app/collections/[slug]/edit-collection-metadata-dialog";
import { CollectionMetadataBadges } from "@/app/collections/[slug]/collection-metadata-badges";
import { CollectionCoverArt } from "@/app/collections/collection-cover-art";
import { ItemThumbnailFrame } from "@/app/collections/item-thumbnail-frame";
import { CollectionQuickActions } from "@/app/collections/collection-quick-actions";
import { CollectionPaletteMiniBar } from "@/app/collections/collection-palette-mini-bar";
import { NewCollectionModal } from "@/app/new-collection-modal";
import { parseCollectionMetadata } from "@/lib/supabase/metadata/collection-schema";
import type { Collection } from "@/lib/supabase/types/collection";
import type { CollectionSummary } from "@/lib/supabase/types/collection";
import {
  useViewLayoutPreference,
  VIEW_LAYOUT_STORAGE,
} from "@/lib/ui/view-layout";

type CollectionsDashboardProps = {
  collections: CollectionSummary[];
};

export function CollectionsDashboard({
  collections: initialCollections,
}: CollectionsDashboardProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [collections, setCollections] =
    useState<CollectionSummary[]>(initialCollections);
  const [viewLayout, setViewLayout] = useViewLayoutPreference(
    VIEW_LAYOUT_STORAGE.collections,
  );
  const [infoCollection, setInfoCollection] = useState<Collection | null>(null);
  const [filters, setFilters] = useState(emptyCollectionFilters);

  const filteredCollections = useMemo(
    () => filterCollections(collections, filters),
    [collections, filters],
  );

  function openCollectionInfo(collection: CollectionSummary) {
    setInfoCollection(collection);
  }

  function closeCollectionInfo() {
    setInfoCollection(null);
  }

  function handleCollectionInfoSaved(updated: Collection) {
    setCollections((prev) =>
      prev.map((row) =>
        row.id === updated.id
          ? {
              ...row,
              ...updated,
              item_count: row.item_count,
              preview_thumbnails: row.preview_thumbnails,
            }
          : row,
      ),
    );
    router.refresh();
  }

  return (
    <>
      <section className="w-full">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Collections
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              {collections.length === 0
                ? "Create your first collection to get started."
                : "Browse and filter your kits."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              <Plus className="size-4" aria-hidden />
              New Collection
            </button>
          </div>
        </div>

        <CollectionsFilterBar
          collections={collections}
          filters={filters}
          filteredCount={filteredCollections.length}
          viewLayout={viewLayout}
          onViewLayoutChange={setViewLayout}
          onChange={setFilters}
          onClear={() => setFilters(emptyCollectionFilters)}
        />

        {collections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
            <p className="text-sm font-medium text-zinc-900">No collections yet</p>
            <p className="mt-1 text-sm text-zinc-600">
              Add one to organize what matters to you.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              <Plus className="size-4" aria-hidden />
              New Collection
            </button>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-900">
              No collections match your filters
            </p>
            <button
              type="button"
              onClick={() => setFilters(emptyCollectionFilters)}
              className="mt-3 text-sm font-medium text-zinc-900 underline"
            >
              Clear filters
            </button>
          </div>
        ) : viewLayout === "list" ? (
          <CollectionsListTable
            collections={filteredCollections}
            onEditInfo={openCollectionInfo}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCollections.map((collection) => (
              <li key={collection.id}>
                <CollectionGalleryCard
                  collection={collection}
                  onEditInfo={() => openCollectionInfo(collection)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <NewCollectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(collection) => {
          setCollections((prev) => [
            {
              ...collection,
              item_count: 0,
              preview_thumbnails: [],
            },
            ...prev,
          ]);
          router.refresh();
        }}
      />

      {infoCollection ? (
        <EditCollectionMetadataDialog
          open
          collection={infoCollection}
          onClose={closeCollectionInfo}
          onSaved={handleCollectionInfoSaved}
        />
      ) : null}
    </>
  );
}

function CollectionGalleryCard({
  collection,
  onEditInfo,
}: {
  collection: CollectionSummary;
  onEditInfo: () => void;
}) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md">
      <Link
        href={`/collections/${collection.slug}`}
        className="flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900"
      >
        <CollectionCoverArt
          coverImageUrl={collection.cover_image_url}
          previewThumbnails={collection.preview_thumbnails}
          alt={`${collection.name} cover`}
          aspectClass="aspect-[16/10]"
        />
        <CollectionPaletteMiniBar metadata={collection.metadata} />
        <div className="flex flex-1 flex-col p-4 pb-3">
          <h2 className="truncate font-medium text-zinc-900">{collection.name}</h2>
          <CollectionMetadataBadges
            metadata={collection.metadata ?? {}}
            className="mt-2"
          />
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-4 py-2">
        <span className="text-xs font-medium tabular-nums text-zinc-700">
          {collection.item_count}{" "}
          {collection.item_count === 1 ? "item" : "items"}
        </span>
        <CollectionQuickActions
          metadata={collection.metadata}
          onEditInfo={onEditInfo}
        />
      </div>
    </div>
  );
}

function CollectionsListTable({
  collections,
  onEditInfo,
}: {
  collections: CollectionSummary[];
  onEditInfo: (collection: CollectionSummary) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[56px_minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_7rem] items-center gap-3 border-b border-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 md:grid">
        <span />
        <span>Collection</span>
        <span>Company</span>
        <span>Designer</span>
        <span>Published</span>
        <span className="text-right">Items</span>
      </div>
      <ul className="divide-y divide-zinc-100">
        {collections.map((collection) => {
          const album = parseCollectionMetadata(collection.metadata);
          return (
            <li
              key={collection.id}
              className="flex items-center gap-2 px-3 py-2.5 transition hover:bg-zinc-50 sm:gap-3 sm:px-4"
            >
              <Link
                href={`/collections/${collection.slug}`}
                className="flex min-w-0 flex-1 items-center gap-3 md:grid md:grid-cols-[56px_minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.8fr)] md:gap-3"
              >
                <div className="flex flex-col gap-1">
                  {collection.cover_image_url ? (
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                      <Image
                        src={collection.cover_image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : collection.preview_thumbnails[0] ? (
                    <ItemThumbnailFrame
                      src={collection.preview_thumbnails[0]}
                      alt=""
                      sizes="48px"
                      variant="inline"
                    />
                  ) : (
                    <div className="size-12 shrink-0 rounded-md bg-zinc-50" />
                  )}
                  <CollectionPaletteMiniBar
                    metadata={collection.metadata}
                    className="w-12"
                  />
                </div>
                <div className="min-w-0 flex-1 md:contents">
                  <span className="block truncate text-sm font-medium text-zinc-900">
                    {collection.name}
                  </span>
                  <span className="hidden truncate text-sm text-zinc-900 md:block">
                    {album.company || "—"}
                  </span>
                  <span className="hidden truncate text-sm text-zinc-900 md:block">
                    {album.designer || "—"}
                  </span>
                  <span className="hidden truncate text-sm text-zinc-900 md:block">
                    {album.published || "—"}
                  </span>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                <span className="text-sm font-medium tabular-nums text-zinc-900">
                  {collection.item_count}
                </span>
                <CollectionQuickActions
                  metadata={collection.metadata}
                  onEditInfo={() => onEditInfo(collection)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}