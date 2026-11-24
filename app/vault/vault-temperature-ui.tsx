"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import {
  VAULT_TEMP_SCALE,
  vaultTempTrend,
  vaultTempTrendText,
  type VaultTempValue,
} from "@/lib/vault/temperature";
import type { VaultTempHistoryEntry } from "@/lib/supabase/types/vault";

export function VaultTempSelector({
  value,
  onChange,
  compact,
}: {
  value: VaultTempValue;
  onChange: (temp: VaultTempValue) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap gap-1.5 ${compact ? "" : "gap-2"}`}
      role="group"
      aria-label="Desire temperature"
    >
      {VAULT_TEMP_SCALE.map((step) => (
        <button
          key={step.value}
          type="button"
          onClick={() => onChange(step.value)}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
            value === step.value
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
          }`}
          title={step.label}
        >
          {step.value} {step.emoji}
        </button>
      ))}
    </div>
  );
}

export function VaultTempCheckInBar({
  currentTemp,
  disabled,
  onCheckIn,
}: {
  currentTemp: VaultTempValue;
  disabled?: boolean;
  onCheckIn: (temp: VaultTempValue) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Temperature check-in">
      {VAULT_TEMP_SCALE.map((step) => (
        <button
          key={step.value}
          type="button"
          disabled={disabled}
          onClick={() => onCheckIn(step.value)}
          className={`size-8 rounded-lg border text-sm transition disabled:opacity-40 ${
            currentTemp === step.value
              ? "border-zinc-800 bg-zinc-100"
              : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50"
          }`}
          title={`${step.label} (${step.value})`}
          aria-label={`Check in ${step.label}`}
        >
          {step.emoji}
        </button>
      ))}
    </div>
  );
}

export function VaultTempTrendBadge({
  initialTemp,
  currentTemp,
}: {
  initialTemp: number;
  currentTemp: number;
}) {
  const trend = vaultTempTrend(initialTemp, currentTemp);
  const text = vaultTempTrendText(initialTemp, currentTemp);

  const style =
    trend === "cooled"
      ? "border-emerald-200/80 bg-emerald-50 text-emerald-900"
      : trend === "heated"
        ? "border-amber-200/80 bg-amber-50 text-amber-950"
        : "border-zinc-200 bg-zinc-50 text-zinc-800";

  return (
    <span
      className={`inline-flex max-w-full rounded-full border px-2 py-0.5 text-[10px] font-medium leading-snug ${style}`}
    >
      {text}
    </span>
  );
}

export function VaultTempTimeline({
  history,
}: {
  history: VaultTempHistoryEntry[];
}) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;

  const sorted = [...history].sort(
    (a, b) =>
      new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime(),
  );

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-600 hover:text-zinc-900"
      >
        Check-in timeline ({history.length})
        <ChevronDown
          className={`size-3 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <ul className="mt-1.5 space-y-1 rounded-lg border border-zinc-100 bg-zinc-50/80 px-2 py-1.5">
          {sorted.map((entry, i) => {
            const step = VAULT_TEMP_SCALE.find((s) => s.value === entry.temp);
            const when = new Date(entry.checked_at);
            const label = Number.isNaN(when.getTime())
              ? entry.checked_at
              : when.toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                });
            return (
              <li
                key={`${entry.checked_at}-${i}`}
                className="flex items-center justify-between gap-2 text-[10px] text-zinc-700"
              >
                <span>
                  {step?.emoji} {entry.temp} · {step?.label}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-500">
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}