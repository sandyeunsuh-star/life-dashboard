"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { periodLabelFromYm } from "@/lib/currents/period";

const DISMISS_KEY = "life-currents-whisper-dismiss-ym";

type CurrentsWhisperNudgeProps = {
  currentYm: string;
};

export function CurrentsWhisperNudge({ currentYm }: CurrentsWhisperNudgeProps) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY);
      setHidden(dismissed === currentYm);
    } catch {
      setHidden(false);
    }
  }, [currentYm]);

  if (hidden) return null;

  const label = periodLabelFromYm(currentYm);
  const monthWord = label.split(" ")[0] ?? "This";

  return (
    <div className="flex items-start gap-3 rounded-xl border border-stone-200/90 bg-[#F7F5F2] px-4 py-3 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium tracking-[0.2em] text-stone-500 uppercase">
          Currents
        </p>
        <p className="mt-1 text-sm text-stone-700">
          <span className="font-serif text-stone-900">{label}</span> isn&apos;t
          in the archive yet.
        </p>
        <Link
          href="/currents"
          className="mt-2 inline-block text-sm font-semibold text-zinc-900 underline decoration-stone-400 underline-offset-2 hover:decoration-zinc-900"
        >
          Open Currents →
        </Link>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            window.localStorage.setItem(DISMISS_KEY, currentYm);
          } catch {
            /* ignore */
          }
          setHidden(true);
        }}
        className="shrink-0 rounded-lg p-1 text-stone-500 hover:bg-stone-200/60 hover:text-stone-800"
        aria-label={`Dismiss ${monthWord} Currents reminder`}
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}