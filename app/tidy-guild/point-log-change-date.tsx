"use client";

import { Calendar } from "lucide-react";
import { useRef, useState } from "react";

import {
  createdAtLocalNoonIso,
  todayLocalDateIso,
  yesterdayLocalDateIso,
} from "@/lib/tidy/backdate-dates";
import { addDays, parseDateString, toDateString } from "@/lib/weekly/dates";

type PointLogChangeDateProps = {
  maxDate: string;
  loading?: boolean;
  onConfirm: (payload: { dateYmd: string; created_at: string }) => void;
  onCancel?: () => void;
};

export function PointLogChangeDate({
  maxDate,
  loading,
  onConfirm,
  onCancel,
}: PointLogChangeDateProps) {
  const today = maxDate || todayLocalDateIso();
  const yesterday = yesterdayLocalDateIso(parseDateString(today));
  const twoDaysAgo = toDateString(addDays(parseDateString(today), -2));
  const [dateYmd, setDateYmd] = useState(yesterday);
  const dateInputRef = useRef<HTMLInputElement>(null);

  function pick(ymd: string) {
    setDateYmd(ymd);
    onConfirm({
      dateYmd: ymd,
      created_at: createdAtLocalNoonIso(ymd),
    });
  }

  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-2"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="w-full text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Change date
      </span>
      <button
        type="button"
        disabled={loading}
        onClick={() => pick(yesterday)}
        className="rounded-full border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-900 hover:bg-white disabled:opacity-40"
      >
        Yesterday
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => pick(twoDaysAgo)}
        className="rounded-full border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-900 hover:bg-white disabled:opacity-40"
      >
        2 Days Ago
      </button>
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={loading}
          onClick={() => dateInputRef.current?.showPicker?.()}
          className="rounded-lg border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          aria-label="Open calendar"
        >
          <Calendar className="size-3.5" />
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
          className="h-7 rounded-lg border border-zinc-200 bg-white px-1.5 text-[10px] text-zinc-900"
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
          className="rounded-lg border border-zinc-900 bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-40"
        >
          {loading ? "…" : "Apply"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-[10px] font-medium text-zinc-500 hover:text-zinc-800"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}