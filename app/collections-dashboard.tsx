"use client";

import { FolderOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { NewCollectionModal } from "@/app/new-collection-modal";
import type { Collection } from "@/lib/supabase/types/collection";

type CollectionsDashboardProps = {
  collections: Collection[];
};

export function CollectionsDashboard({
  collections: initialCollections,
}: CollectionsDashboardProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [collections, setCollections] = useState(initialCollections);

  return (
    <>
      <section className="w-full">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Collections
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {collections.length === 0
                ? "Create your first collection to get started."
                : `${collections.length} collection${collections.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            <Plus className="size-4" aria-hidden />
            New Collection
          </button>
        </div>

        {collections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
            <FolderOpen
              className="mx-auto size-10 text-zinc-300"
              aria-hidden
            />
            <p className="mt-4 text-sm font-medium text-zinc-700">
              No collections yet
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Add one to organize what matters to you.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              <Plus className="size-4" aria-hidden />
              New Collection
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <li key={collection.id}>
                <Link
                  href={`/collections/${collection.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition group-hover:bg-zinc-900 group-hover:text-white">
                      <FolderOpen className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-medium text-zinc-900">
                        {collection.name}
                      </h2>
                      {collection.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                          {collection.description}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-zinc-400 italic">
                          No description
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-4 font-mono text-[11px] text-zinc-400">
                    /{collection.slug}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <NewCollectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(collection) => {
          setCollections((prev) => [collection, ...prev]);
          router.refresh();
        }}
      />
    </>
  );
}