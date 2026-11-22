"use client";

import { Check, ExternalLink } from "lucide-react";
import Image from "next/image";

import {
  getItemFileName,
  itemFileNameDiffersFromTitle,
} from "@/lib/supabase/items/item-labels";
import { parseItemMetadata } from "@/lib/supabase/metadata/schema";
import type { Item } from "@/lib/supabase/types/item";
import { DriveQuickDownloadButton } from "@/lib/ui/drive-quick-download-button";
import { ItemTagPills } from "@/lib/ui/item-tag-pills";

type CollectionItemsListProps = {
  items: Item[];
  selectedIds: Set<string>;
  selectionActive: boolean;
  activeFilterTags?: string[];
  onToggleFilterTag?: (tag: string) => void;
  onToggleSelect: (item: Item, index: number, shiftKey: boolean) => void;
  onOpenItem: (item: Item) => void;
};

export function CollectionItemsList({
  items,
  selectedIds,
  selectionActive,
  activeFilterTags = [],
  onToggleFilterTag,
  onToggleSelect,
  onOpenItem,
}: CollectionItemsListProps) {
  function activateRow(
    item: Item,
    index: number,
    opts: { shiftKey: boolean },
  ) {
    if (opts.shiftKey || selectionActive) {
      onToggleSelect(item, index, opts.shiftKey);
      return;
    }
    onOpenItem(item);
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[40px_56px_minmax(0,1.2fr)_minmax(0,1fr)_88px_minmax(0,0.8fr)_44px] gap-3 border-b border-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 lg:grid">
        <span />
        <span />
        <span>Name</span>
        <span>File name</span>
        <span>Type</span>
        <span>Tags</span>
        <span className="sr-only">Drive</span>
      </div>
      <ul className="divide-y divide-zinc-100">
        {items.map((item, index) => {
          const meta = parseItemMetadata(item.metadata);
          const isSelected = selectedIds.has(item.id);

          return (
            <li key={item.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={(e) =>
                  activateRow(item, index, { shiftKey: e.shiftKey })
                }
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  activateRow(item, index, { shiftKey: e.shiftKey });
                }}
                className="grid w-full cursor-pointer grid-cols-[40px_56px_1fr] items-center gap-2 px-3 py-2 text-left transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 sm:grid-cols-[40px_56px_1fr_auto] sm:gap-3 sm:px-4 sm:py-2.5 lg:grid-cols-[40px_56px_minmax(0,1.2fr)_minmax(0,1fr)_88px_minmax(0,0.8fr)_44px]"
              >
                <button
                  type="button"
                  aria-label={isSelected ? "Deselect item" : "Select item"}
                  aria-pressed={isSelected}
                  className={`relative z-20 flex size-6 items-center justify-center rounded-md border ${
                    isSelected
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-transparent hover:text-zinc-400"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onToggleSelect(item, index, e.shiftKey);
                  }}
                >
                  {isSelected ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : null}
                </button>

                <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                  <Image
                    src={item.thumbnail_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>

                <div className="min-w-0 lg:contents">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {item.title}
                    </p>
                    {itemFileNameDiffersFromTitle(item) ? (
                      <p className="truncate font-mono text-[10px] text-zinc-600">
                        {getItemFileName(item)}
                      </p>
                    ) : null}
                  </div>
                  <p className="hidden truncate text-sm text-zinc-700 lg:block">
                    {meta.file_name ?? "—"}
                  </p>
                  <span className="hidden w-fit rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-900 lg:inline-flex">
                    {meta.type || "—"}
                  </span>
                  <div className="hidden min-w-0 lg:block">
                    {item.tags.length > 0 ? (
                      <ItemTagPills
                        tags={item.tags}
                        activeFilterTags={activeFilterTags}
                        onToggleFilter={onToggleFilterTag}
                        maxVisible={3}
                      />
                    ) : (
                      <span className="text-sm text-zinc-700">—</span>
                    )}
                  </div>
                  <div className="relative z-20 hidden items-center gap-1 lg:flex">
                    <DriveQuickDownloadButton
                      driveUrl={item.drive_url}
                      className="relative z-20"
                    />
                    {item.drive_url ? (
                      <a
                        href={item.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-900 hover:bg-zinc-50"
                        title="Open in Google Drive"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    ) : (
                      <span className="inline-block size-9" aria-hidden />
                    )}
                  </div>
                </div>

                <div className="col-span-3 flex flex-col gap-0.5 text-xs text-zinc-700 sm:col-span-1 lg:hidden">
                  {meta.file_name ? (
                    <span className="truncate">{meta.file_name}</span>
                  ) : null}
                  {meta.type ? (
                    <span className="font-medium text-zinc-900">{meta.type}</span>
                  ) : null}
                  <ItemTagPills
                    tags={item.tags}
                    activeFilterTags={activeFilterTags}
                    onToggleFilter={onToggleFilterTag}
                    maxVisible={4}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}