"use client";

import Image from "next/image";
import { Shuffle } from "lucide-react";
import { useCallback, useState } from "react";

import { formatGratitudeEntryDate } from "@/lib/gratitude/format-entry-date";
import { pickRandomGratitudeMemory } from "@/lib/gratitude/smile-jar";
import type {
  GratitudeEntryRow,
  GratitudeMemoryPick,
} from "@/lib/supabase/types/gratitude";

type GratitudeSmileJarProps = {
  entries: GratitudeEntryRow[];
  initialMemory: GratitudeMemoryPick | null;
  compact?: boolean;
};

export function GratitudeSmileJar({
  entries,
  initialMemory,
  compact = false,
}: GratitudeSmileJarProps) {
  const [memory, setMemory] = useState(initialMemory);

  const shuffle = useCallback(() => {
    setMemory(
      pickRandomGratitudeMemory(entries, {
        seed: `${Date.now()}-${Math.random()}`,
      }),
    );
  }, [entries]);

  if (!memory) {
    return (
      <div
        className={`rounded-xl border border-zinc-200 bg-white ${compact ? "p-4" : "p-5"}`}
      >
        <p className="text-xs font-medium text-zinc-500">Smile jar</p>
        <p className="mt-1 text-sm text-zinc-600">
          Save a gratitude entry and happy memories will collect here.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white ${compact ? "p-4" : "p-5"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-500">
            Remind me of something good
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            {formatGratitudeEntryDate(memory.entryDate)}
          </p>
        </div>
        <button
          type="button"
          onClick={shuffle}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Shuffle className="size-3.5" aria-hidden />
          Shuffle memory
        </button>
      </div>
      <div className="mt-3 flex gap-3">
        {memory.photoUrl ? (
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
            <Image
              src={memory.photoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
              loading="lazy"
              unoptimized
            />
          </div>
        ) : null}
        <p className={`text-sm leading-relaxed text-zinc-800 ${compact ? "" : "text-base"}`}>
          {memory.label}
        </p>
      </div>
    </div>
  );
}