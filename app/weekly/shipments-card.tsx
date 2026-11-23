"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { ShipmentRow } from "@/lib/supabase/types/shipment";
import {
  SHIPMENT_STATUSES,
  type ShipmentStatus,
} from "@/lib/weekly/constants";

const STATUS_STYLES: Record<ShipmentStatus, string> = {
  Ordered: "bg-sky-50 text-sky-800 border-sky-200",
  Shipped: "bg-violet-50 text-violet-800 border-violet-200",
  Customs: "bg-amber-50 text-amber-900 border-amber-200",
  Delivered: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

type ShipmentsCardProps = {
  shipments: ShipmentRow[];
  onCreate: (
    label: string,
    status: ShipmentStatus,
    trackingUrl: string | null,
  ) => Promise<void>;
  onUpdate: (id: string, patch: Partial<ShipmentRow>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function ShipmentsCard({
  shipments,
  onCreate,
  onUpdate,
  onDelete,
}: ShipmentsCardProps) {
  const [showDelivered, setShowDelivered] = useState(false);
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<ShipmentStatus>("Ordered");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const visible = useMemo(
    () =>
      shipments.filter((s) => showDelivered || !s.is_delivered),
    [shipments, showDelivered],
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setAdding(true);
    try {
      await onCreate(
        label.trim(),
        status,
        trackingUrl.trim() ? trackingUrl.trim() : null,
      );
      setLabel("");
      setTrackingUrl("");
      setStatus("Ordered");
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-widest text-zinc-500">
          SHIPMENTS
        </h2>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={showDelivered}
            onChange={(e) => setShowDelivered(e.target.checked)}
            className="size-3.5 rounded border-zinc-300 text-zinc-900"
          />
          Show delivered
        </label>
      </div>

      <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Shipment label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='e.g. "Thursday Boots"'
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10"
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
        >
          {SHIPMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={trackingUrl}
          onChange={(e) => setTrackingUrl(e.target.value)}
          placeholder="Tracking URL (optional)"
          className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 sm:max-w-[12rem]"
        />
        <button
          type="submit"
          disabled={adding || !label.trim()}
          className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {visible.length === 0 ? (
          <li className="text-sm text-zinc-500">No active shipments.</li>
        ) : (
          visible.map((s) => (
            <li
              key={s.id}
              className="group flex flex-wrap items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={s.is_delivered}
                onChange={(e) =>
                  onUpdate(s.id, {
                    is_delivered: e.target.checked,
                    status: e.target.checked ? "Delivered" : s.status,
                  })
                }
                className="size-4 shrink-0 rounded-full border-zinc-300 text-zinc-900"
                aria-label={`Mark ${s.label} delivered`}
              />
              <span
                className={`min-w-0 flex-1 text-sm font-medium text-zinc-900 ${s.is_delivered ? "line-through text-zinc-500" : ""}`}
              >
                {s.label}
              </span>
              <select
                value={s.status}
                onChange={(e) =>
                  onUpdate(s.id, { status: e.target.value as ShipmentStatus })
                }
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[s.status]}`}
              >
                {SHIPMENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              {s.tracking_url ? (
                <a
                  href={s.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white hover:text-zinc-900"
                  aria-label="Open tracking"
                >
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => onDelete(s.id)}
                className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-400 opacity-0 transition hover:bg-white hover:text-red-600 group-hover:opacity-100"
                aria-label={`Delete ${s.label}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}