"use client";

import { ChevronDown, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ShipmentRow } from "@/lib/supabase/types/shipment";
import {
  SHIPMENT_STATUSES,
  type ShipmentStatus,
} from "@/lib/weekly/constants";

const STATUS_STYLES: Record<ShipmentStatus, string> = {
  Ordered: "bg-zinc-100 text-zinc-800 border-zinc-200",
  Shipped: "bg-blue-50 text-blue-800 border-blue-200",
  Customs: "bg-amber-50 text-amber-900 border-amber-200",
  Delivered: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

const SHIPMENTS_COLLAPSED_STORAGE_KEY =
  "life-dashboard:weekly:shipments-collapsed";

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10";

export type CreateShipmentPayload = {
  label: string;
  status: ShipmentStatus;
  tracking_number: string | null;
  tracking_url: string | null;
  notes: string | null;
};

type ShipmentsCardProps = {
  shipments: ShipmentRow[];
  onCreate: (payload: CreateShipmentPayload) => Promise<void>;
  onUpdate: (id: string, patch: Partial<ShipmentRow>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function trackingPillLabel(number: string): string {
  const n = number.trim();
  if (n.length <= 8) return `#${n}`;
  return `#${n.slice(0, 5)}…`;
}

export function ShipmentsCard({
  shipments,
  onCreate,
  onUpdate,
  onDelete,
}: ShipmentsCardProps) {
  const [showDelivered, setShowDelivered] = useState(false);
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<ShipmentStatus>("Ordered");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SHIPMENTS_COLLAPSED_STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          SHIPMENTS_COLLAPSED_STORAGE_KEY,
          String(next),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const activeCount = useMemo(
    () => shipments.filter((s) => !s.is_delivered).length,
    [shipments],
  );

  const visible = useMemo(
    () => shipments.filter((s) => showDelivered || !s.is_delivered),
    [shipments, showDelivered],
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setAdding(true);
    try {
      await onCreate({
        label: label.trim(),
        status,
        tracking_number: trackingNumber.trim() || null,
        tracking_url: trackingUrl.trim() || null,
        notes: notes.trim() || null,
      });
      setLabel("");
      setTrackingNumber("");
      setTrackingUrl("");
      setNotes("");
      setStatus("Ordered");
    } finally {
      setAdding(false);
    }
  }

  return (
    <section
      className={`rounded-xl border border-zinc-200 bg-white shadow-sm ${collapsed ? "px-5 py-3" : "p-5"}`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 ${collapsed ? "" : "mb-4"}`}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          className="inline-flex items-center gap-2 rounded-lg py-1 text-left transition hover:bg-zinc-50"
          aria-expanded={!collapsed}
        >
          <ChevronDown
            className={`size-4 shrink-0 text-zinc-400 transition ${collapsed ? "-rotate-90" : ""}`}
            aria-hidden
          />
          <h2 className="text-xs font-semibold tracking-widest text-zinc-500">
            SHIPMENTS ({activeCount})
          </h2>
        </button>
        {!collapsed ? (
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={showDelivered}
              onChange={(e) => setShowDelivered(e.target.checked)}
              className="size-3.5 rounded border-zinc-300 text-zinc-900"
            />
            Show delivered
          </label>
        ) : null}
      </div>

      {collapsed ? null : (
        <>
      <form
        onSubmit={handleAdd}
        className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-12 lg:items-end"
      >
        <label className="sm:col-span-2 lg:col-span-3">
          <span className="mb-1 block text-[11px] font-medium text-zinc-500">
            Item / label
          </span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='e.g. "Thursday Boots"'
            className={inputClass}
          />
        </label>
        <label className="lg:col-span-2">
          <span className="mb-1 block text-[11px] font-medium text-zinc-500">
            Status
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
            className={inputClass}
          >
            {SHIPMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="lg:col-span-2">
          <span className="mb-1 block text-[11px] font-medium text-zinc-500">
            Tracking #
          </span>
          <input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Optional"
            className={`${inputClass} font-mono`}
          />
        </label>
        <label className="lg:col-span-2">
          <span className="mb-1 block text-[11px] font-medium text-zinc-500">
            Tracking URL
          </span>
          <input
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </label>
        <label className="sm:col-span-2 lg:col-span-2">
          <span className="mb-1 block text-[11px] font-medium text-zinc-500">
            Notes
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Courier, proxy…"
            className={inputClass}
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-1">
          <button
            type="submit"
            disabled={adding || !label.trim()}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        {visible.length === 0 ? (
          <li className="text-sm text-zinc-500">No active shipments.</li>
        ) : (
          visible.map((s) => (
            <ShipmentRowItem
              key={s.id}
              shipment={s}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))
        )}
      </ul>
        </>
      )}
    </section>
  );
}

function ShipmentRowItem({
  shipment: s,
  onUpdate,
  onDelete,
}: {
  shipment: ShipmentRow;
  onUpdate: (id: string, patch: Partial<ShipmentRow>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [inlineLabel, setInlineLabel] = useState(s.label);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const skipTitleBlurSave = useRef(false);

  const [draftLabel, setDraftLabel] = useState(s.label);
  const [draftNumber, setDraftNumber] = useState(s.tracking_number ?? "");
  const [draftUrl, setDraftUrl] = useState(s.tracking_url ?? "");
  const [draftNotes, setDraftNotes] = useState(s.notes ?? "");

  const syncDrafts = useCallback(() => {
    setDraftLabel(s.label);
    setDraftNumber(s.tracking_number ?? "");
    setDraftUrl(s.tracking_url ?? "");
    setDraftNotes(s.notes ?? "");
  }, [s.label, s.tracking_number, s.tracking_url, s.notes]);

  useEffect(() => {
    if (!editingTitle) setInlineLabel(s.label);
  }, [s.label, editingTitle]);

  function toggleExpanded() {
    setExpanded((open) => {
      if (!open) syncDrafts();
      return !open;
    });
  }

  async function copyTrackingNumber() {
    const num = s.tracking_number?.trim();
    if (!num) return;
    try {
      await navigator.clipboard.writeText(num);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  async function saveField(
    patch: Partial<
      Pick<
        ShipmentRow,
        "label" | "tracking_number" | "tracking_url" | "notes"
      >
    >,
  ) {
    await onUpdate(s.id, patch);
  }

  async function commitLabel(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setInlineLabel(s.label);
      setEditingTitle(false);
      return;
    }
    if (trimmed !== s.label) {
      await saveField({ label: trimmed });
    }
    setEditingTitle(false);
  }

  function cancelTitleEdit() {
    skipTitleBlurSave.current = true;
    setInlineLabel(s.label);
    setEditingTitle(false);
    window.requestAnimationFrame(() => {
      skipTitleBlurSave.current = false;
    });
  }

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  const hasNotes = Boolean(s.notes?.trim());

  return (
    <li className="group rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2">
      <div className="flex flex-wrap items-start gap-2">
        <input
          type="checkbox"
          checked={s.is_delivered}
          onChange={(e) =>
            onUpdate(s.id, {
              is_delivered: e.target.checked,
              status: e.target.checked ? "Delivered" : s.status,
            })
          }
          className="mt-1 size-4 shrink-0 rounded-full border-zinc-300 text-zinc-900"
          aria-label={`Mark ${s.label} delivered`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={inlineLabel}
                  onChange={(e) => setInlineLabel(e.target.value)}
                  onBlur={() => {
                    if (skipTitleBlurSave.current) return;
                    void commitLabel(inlineLabel);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void commitLabel(inlineLabel);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      cancelTitleEdit();
                    }
                  }}
                  className={`min-w-0 flex-1 border-0 bg-transparent py-1 text-sm font-medium text-zinc-900 outline-none ring-0 ${s.is_delivered ? "line-through text-zinc-500" : ""}`}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setInlineLabel(s.label);
                    setEditingTitle(true);
                  }}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium text-zinc-900 transition hover:text-zinc-700"
                >
                  <span
                    className={
                      s.is_delivered ? "line-through text-zinc-500" : ""
                    }
                  >
                    {s.label}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={toggleExpanded}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white hover:text-zinc-700"
                aria-expanded={expanded}
                aria-label="Edit tracking and notes"
              >
                <ChevronDown
                  className={`size-3.5 transition ${expanded ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
            </div>

            {s.tracking_number?.trim() ? (
              <button
                type="button"
                onClick={copyTrackingNumber}
                className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[11px] font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
                title={s.tracking_number}
              >
                {copied ? (
                  <span className="text-emerald-700">Copied!</span>
                ) : (
                  trackingPillLabel(s.tracking_number)
                )}
              </button>
            ) : null}

            {s.tracking_url?.trim() ? (
              <a
                href={s.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900"
              >
                Track ↗
              </a>
            ) : null}

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

            <button
              type="button"
              onClick={() => onDelete(s.id)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 opacity-0 transition hover:bg-white hover:text-red-600 group-hover:opacity-100"
              aria-label={`Delete ${s.label}`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          {hasNotes && !expanded ? (
            <p className="mt-1 text-xs text-zinc-500">{s.notes}</p>
          ) : null}

          {expanded ? (
            <div className="mt-3 grid gap-2 border-t border-zinc-200/80 pt-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-[11px] font-medium text-zinc-500">
                  Item / label
                </span>
                <input
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onBlur={() => {
                    const trimmed = draftLabel.trim();
                    if (!trimmed) {
                      setDraftLabel(s.label);
                      return;
                    }
                    if (trimmed !== s.label) {
                      void saveField({ label: trimmed });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    } else if (e.key === "Escape") {
                      setDraftLabel(s.label);
                      e.currentTarget.blur();
                    }
                  }}
                  className={`${inputClass} text-xs`}
                  placeholder="Shipment label"
                />
              </label>
              <label className="sm:col-span-1">
                <span className="mb-1 block text-[11px] font-medium text-zinc-500">
                  Tracking #
                </span>
                <input
                  value={draftNumber}
                  onChange={(e) => setDraftNumber(e.target.value)}
                  onBlur={() =>
                    void saveField({
                      tracking_number: draftNumber.trim() || null,
                    })
                  }
                  className={`${inputClass} font-mono text-xs`}
                  placeholder="Tracking number"
                />
              </label>
              <label className="sm:col-span-1">
                <span className="mb-1 block text-[11px] font-medium text-zinc-500">
                  Tracking URL
                </span>
                <input
                  value={draftUrl}
                  onChange={(e) => setDraftUrl(e.target.value)}
                  onBlur={() =>
                    void saveField({
                      tracking_url: draftUrl.trim() || null,
                    })
                  }
                  className={`${inputClass} text-xs`}
                  placeholder="https://…"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-[11px] font-medium text-zinc-500">
                  Notes
                </span>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  onBlur={() =>
                    void saveField({ notes: draftNotes.trim() || null })
                  }
                  rows={2}
                  className={`${inputClass} resize-y text-xs`}
                  placeholder="Courier, proxy, pickup details…"
                />
              </label>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}