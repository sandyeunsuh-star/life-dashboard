"use client";

import { ArrowRight, ExternalLink, Scissors } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { STATUS_PILL_STYLES, type KnittingStatus } from "@/lib/knitting/constants";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { moveKnittingPatternToLibrary } from "@/lib/supabase/queries/knitting-patterns";
import { resolveKnittingCoverUrl } from "@/lib/supabase/storage/pattern-covers";
import { createKnittingSignedUrl } from "@/lib/supabase/storage/knitting-patterns";
import type { KnittingPatternRow } from "@/lib/supabase/types/knitting-pattern";
import { PatternRewardBridge } from "@/app/designer/pattern-reward-bridge";
import type { PatternRewardLink } from "@/lib/supabase/queries/tidy-reward-bridge";

type KnittingPatternCardProps = {
  pattern: KnittingPatternRow;
  wishlistView: boolean;
  rewardLink?: PatternRewardLink | null;
  onRewardLinkChange?: (
    patternId: string,
    link: PatternRewardLink | null,
  ) => void;
  onOpen: (pattern: KnittingPatternRow) => void;
  onUpdated: (pattern: KnittingPatternRow) => void;
};

function specLine(p: KnittingPatternRow): string {
  return [p.yarn_weight, p.needle_size, p.gauge].filter(Boolean).join(" · ");
}

export function KnittingPatternCard({
  pattern,
  wishlistView,
  rewardLink = null,
  onRewardLinkChange,
  onOpen,
  onUpdated,
}: KnittingPatternCardProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!pattern.cover_path) {
      setCoverUrl(null);
      return;
    }
    let cancelled = false;
    const supabase = createBrowserClientInstance();
    void resolveKnittingCoverUrl(supabase, pattern.cover_path).then((url) => {
      if (!cancelled) setCoverUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [pattern.cover_path]);

  async function openPdf(e: React.MouseEvent) {
    e.stopPropagation();
    if (!pattern.pdf_path) return;
    const supabase = createBrowserClientInstance();
    const { url } = await createKnittingSignedUrl(supabase, pattern.pdf_path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function openPurchaseUrl(e: React.MouseEvent) {
    e.stopPropagation();
    const url = pattern.purchase_url?.trim();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function moveToLibrary(e: React.MouseEvent) {
    e.stopPropagation();
    setMoving(true);
    try {
      const supabase = createBrowserClientInstance();
      const { data, error } = await moveKnittingPatternToLibrary(
        supabase,
        pattern.id,
      );
      if (error) throw error;
      if (data) onUpdated(data);
    } catch (err) {
      console.error(formatSupabaseError(err));
    } finally {
      setMoving(false);
    }
  }

  const specs = specLine(pattern);
  const status = pattern.status as KnittingStatus;
  const showLibraryStatus = !wishlistView && !pattern.is_wishlist;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(pattern)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(pattern);
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-sm transition hover:border-zinc-300 hover:shadow-md"
    >
      <div className="relative aspect-[4/5] w-full bg-zinc-100">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 20vw"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
            <Scissors className="size-8" aria-hidden />
            <span className="text-xs font-medium">No cover</span>
          </div>
        )}
        {showLibraryStatus ? (
          <span
            className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL_STYLES[status] ?? STATUS_PILL_STYLES["In Queue"]}`}
          >
            {pattern.status}
          </span>
        ) : wishlistView ? (
          <span className="absolute left-2 top-2 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
            Wishlist
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">
          {pattern.title}
        </h3>
        {pattern.designer ? (
          <p className="truncate text-xs text-zinc-600">{pattern.designer}</p>
        ) : null}
        {specs ? (
          <p className="line-clamp-2 text-[11px] text-zinc-500">{specs}</p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2">
          {wishlistView || pattern.is_wishlist ? (
            <>
              {wishlistView && onRewardLinkChange ? (
                <PatternRewardBridge
                  patternId={pattern.id}
                  title={pattern.title}
                  imageUrl={coverUrl}
                  purchaseUrl={pattern.purchase_url}
                  source="knitting"
                  link={rewardLink}
                  onLinkChange={onRewardLinkChange}
                />
              ) : null}
              {pattern.purchase_url?.trim() ? (
                <button
                  type="button"
                  onClick={openPurchaseUrl}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-800 transition hover:bg-white"
                >
                  View Pattern
                  <ExternalLink className="size-3" aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                disabled={moving}
                onClick={moveToLibrary}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50"
              >
                Move to Library
                <ArrowRight className="size-3" aria-hidden />
              </button>
            </>
          ) : pattern.pdf_path ? (
            <button
              type="button"
              onClick={openPdf}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-800 transition hover:bg-white"
            >
              Open PDF
              <ExternalLink className="size-3" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}