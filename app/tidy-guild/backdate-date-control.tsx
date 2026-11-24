"use client";

import {
  todayLocalDateIso,
  yesterdayLocalDateIso,
} from "@/lib/tidy/backdate-dates";

type BackdateDateControlProps = {
  /** Selected local date YYYY-MM-DD */
  value: string;
  onChange: (next: string) => void;
  /** Max selectable date (usually today local). */
  maxDate: string;
  className?: string;
  size?: "sm" | "md";
};

export function BackdateDateControl({
  value,
  onChange,
  maxDate,
  className = "",
  size = "md",
}: BackdateDateControlProps) {
  const todayIso = maxDate || todayLocalDateIso();
  const yesterdayIso = yesterdayLocalDateIso(
    new Date(`${todayIso}T12:00:00`),
  );

  const chipClass = (active: boolean) =>
    `rounded-full border px-2 py-0.5 font-medium tabular-nums transition ${
      size === "sm" ? "text-[10px]" : "text-xs"
    } ${
      active
        ? "border-zinc-900 bg-zinc-900 text-white"
        : "border-zinc-300 bg-zinc-50 text-zinc-900 hover:bg-white"
    }`;

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${className}`.trim()}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Date
      </span>
      <button
        type="button"
        onClick={() => onChange(todayIso)}
        className={chipClass(value === todayIso)}
      >
        Today
      </button>
      <button
        type="button"
        onClick={() => onChange(yesterdayIso)}
        className={chipClass(value === yesterdayIso)}
      >
        Yesterday
      </button>
      <input
        type="date"
        value={value}
        max={todayIso}
        onChange={(e) => {
          const next = e.target.value;
          if (next && next <= todayIso) onChange(next);
        }}
        className={`rounded-lg border border-zinc-200 bg-white text-zinc-900 ${
          size === "sm"
            ? "h-7 px-1.5 text-[10px]"
            : "h-8 px-2 text-xs"
        }`}
        aria-label="Pick date"
      />
    </div>
  );
}