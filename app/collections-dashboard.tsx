"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CollectionMetadataBadges } from "@/app/collections/[slug]/collection-metadata-badges";
import { CollectionCoverArt } from "@/app/collections/collection-cover-art";
import { OpenDriveFolderLink } from "@/app/collections/open-drive-folder-link";
import { CollectionPaletteMiniBar } from "@/app/collections/collection-palette-mini-bar";
import { NewCollectionModal } from "@/app/new-collection-modal";
import { parseCollectionMetadata } from "@/lib/supabase/metadata/collection-schema";
import type { CollectionSummary } from "@/lib/supabase/types/collection";
import {
  useViewLayoutPreference,
  VIEW_LAYOUT_STORAGE,
} from "@/lib/ui/view-layout";
import { ViewLayoutToggle } from "@/lib/ui/view-layout-toggle";

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
                : `${collections.length} collection${collections.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewLayoutToggle
              value={viewLayout}
              onChange={setViewLayout}
              ariaLabel="Collections view layout"
            />
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
        ) : viewLayout === "list" ? (
          <CollectionsListTable collections={collections} />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <li key={collection.id}>
                <CollectionGalleryCard collection={collection} />
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
    </>
  );
}

function CollectionGalleryCard({
  collection,
}: {
  collection: CollectionSummary;
}) {
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md"
    >
      <CollectionCoverArt
        coverImageUrl={collection.cover_image_url}
        previewThumbnails={collection.preview_thumbnails}
        alt={`${collection.name} cover`}
        aspectClass="aspect-[16/10]"
      />
      <CollectionPaletteMiniBar metadata={collection.metadata} />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="truncate font-medium text-zinc-900">
            {collection.name}
          </h2>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-900">
            {collection.item_count}{" "}
            {collection.item_count === 1 ? "item" : "items"}
          </span>
        </div>
        {collection.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-zinc-700">
            {collection.description}
          </p>
        ) : (
          <p className="mt-1 text-sm italic text-zinc-400">No description</p>
        )}
        <CollectionMetadataBadges
          metadata={collection.metadata ?? {}}
          className="mt-3"
        />
        <OpenDriveFolderLink
          metadata={collection.metadata}
          variant="inline"
          className="mt-2"
        />
      </div>
    </Link>
  );
}

function CollectionsListTable({
  collections,
}: {
  collections: CollectionSummary[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[56px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_72px] gap-3 border-b border-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 md:grid">
        <span />
        <span>Collection</span>
        <span>Description</span>
        <span>Company</span>
        <span>Designer</span>
        <span>Published</span>
        <span className="text-right">Items</span>
      </div>
      <ul className="divide-y divide-zinc-100">
        {collections.map((collection) => {
          const album = parseCollectionMetadata(collection.metadata);
          return (
            <li key={collection.id}>
              <Link
                href={`/collections/${collection.slug}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-zinc-50 md:grid md:grid-cols-[56px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_72px] md:gap-3 md:py-2.5"
              >
                <div className="flex flex-col gap-1">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                  {collection.cover_image_url ? (
                    <Image
                      src={collection.cover_image_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : collection.preview_thumbnails[0] ? (
                    <Image
                      src={collection.preview_thumbnails[0]}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="h-full w-full bg-zinc-100" />
                  )}
                </div>
                <CollectionPaletteMiniBar
                  metadata={collection.metadata}
                  className="w-12"
                />
                </div>
                <div className="min-w-0 md:contents">
                  <span className="truncate text-sm font-medium text-zinc-900">
                    {collection.name}
                  </span>
                  <span className="hidden truncate text-sm text-zinc-700 md:block">
                    {collection.description || "—"}
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
                  <div className="hidden flex-col items-end gap-1 md:flex">
                    <span className="text-right text-sm font-medium text-zinc-900">
                      {collection.item_count}
                    </span>
                    <OpenDriveFolderLink
                      metadata={collection.metadata}
                      variant="inline"
                    />
                  </div>
                </div>
                <p className="ml-auto text-xs text-zinc-700 md:hidden">
                  {collection.item_count} items
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}