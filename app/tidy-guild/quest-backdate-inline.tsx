"use client";

import { Calendar } from "lucide-react";
import { useRef, useState } from "react";

import {
  createdAtLocalNoonIso,
  todayLocalDateIso,
  yesterdayLocalDateIso,
} from "@/lib/tidy/backdate-dates";
import { addDays, parseDateString, toDateString } from "@/lib/weekly/dates";

type QuestBackdateInlineProps = {
  maxDate: string;
  points: number;
  loading?: boolean;
  onConfirm: (payload: { dateYmd: string; created_at: string }) => void;
};

export function QuestBackdateInline({
  maxDate,
  points,
  loading,
  onConfirm,
}: QuestBackdateInlineProps) {
  const today = maxDate || todayLocalDateIso();
  const yesterday = yesterdayLocalDateIso(parseDateString(today));
  const twoDaysAgo = toDateString(addDays(parseDateString(today), -2));
  const [dateYmd, setDateYmd] = useState(yesterday);
  const dateInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="border-t border-zinc-100 bg-zinc-50/80 px-3 py-2.5"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Log for past date
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={loading}
          onClick={() => setDateYmd(yesterday)}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition disabled:opacity-40 ${
            dateYmd === yesterday
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
          }`}
        >
          Yesterday
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setDateYmd(twoDaysAgo)}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition disabled:opacity-40 ${
            dateYmd === twoDaysAgo
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
          }`}
        >
          2 Days Ago
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => dateInputRef.current?.showPicker?.()}
          className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
          aria-label="Open calendar"
        >
          <Calendar className="size-4" />
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={dateYmd}
          max={today}
          onChange={(e) => {
            const next = e.target.value;
            if (next && next <= today) setDateYmd(next);
          }}
          className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900"
          aria-label="Pick date"
        />
        <button
          type="button"
          disabled={loading || !dateYmd}
          onClick={() =>
            onConfirm({
              dateYmd,
              created_at: createdAtLocalNoonIso(dateYmd),
            })
          }
          className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {loading ? "…" : `Log Points (+${points})`}
        </button>
      </div>
    </div>
  );
}