"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { VaultThumbnail } from "@/app/vault/vault-thumbnail";
import {
  VaultTempCheckInBar,
  VaultTempTrendBadge,
} from "@/app/vault/vault-temperature-ui";
import { formatVaultCountdownShort, formatVaultPrice } from "@/lib/vault/format";
import type { VaultTempValue } from "@/lib/vault/temperature";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { revalidateAfterTidyPoints } from "@/lib/tidy/revalidate-after-points";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  checkInVaultTemperature,
  skipVaultItem,
} from "@/lib/supabase/queries/vault";
import type { VaultItem } from "@/lib/supabase/types/vault";

const VAULT_WIDGET_COLLAPSED_KEY =
  "life-dashboard:weekly:vault-temperature-collapsed";

type VaultTemperatureWidgetProps = {
  initialPaused: VaultItem[];
  totalPausedCount: number;
};

export function VaultTemperatureWidget({
  initialPaused,
  totalPausedCount,
}: VaultTemperatureWidgetProps) {
  const [items, setItems] = useState(initialPaused);
  const [collapsed, setCollapsed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialPaused);
  }, [initialPaused]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VAULT_WIDGET_COLLAPSED_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(VAULT_WIDGET_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const hasActive = totalPausedCount > 0;

  if (!hasActive) {
    return (
      <p className="text-center text-xs text-zinc-500">
        <Link href="/vault" className="font-medium text-zinc-700 underline-offset-2 hover:underline">
          Open The Vault
        </Link>{" "}
        to park impulse buys
      </p>
    );
  }

  const remaining = Math.max(0, totalPausedCount - items.length);

  return (
    <>
      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
            Vault temperature check ({totalPausedCount})
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-zinc-600 transition ${collapsed ? "" : "rotate-180"}`}
          />
        </button>
        {!collapsed ? (
          <ul className="space-y-3 border-t border-zinc-100 px-4 py-3">
            {items.map((item) => (
              <VaultWidgetRow
                key={item.id}
                item={item}
                busy={busyId === item.id}
                onTempCheckIn={async (temp) => {
                  setBusyId(item.id);
                  const supabase = createBrowserClientInstance();
                  const { data, error } = await checkInVaultTemperature(
                    supabase,
                    item,
                    temp,
                  );
                  setBusyId(null);
                  if (error || !data) {
                    console.error(formatSupabaseError(error));
                    return;
                  }
                  setItems((prev) =>
                    prev.map((i) => (i.id === data.id ? data : i)),
                  );
                }}
                onSkip={async () => {
                  setBusyId(item.id);
                  const supabase = createBrowserClientInstance();
                  const { data, error } = await skipVaultItem(supabase, item);
                  setBusyId(null);
                  if (error || !data) {
                    console.error(formatSupabaseError(error));
                    return;
                  }
                  setItems((prev) => prev.filter((i) => i.id !== item.id));
                  const saved = formatVaultPrice(
                    item.price_amount,
                    item.currency,
                  );
                  showToast(
                    `Kept ${saved} safe · +${item.reward_points} Tidy Guild pts!`,
                  );
                  await revalidateAfterTidyPoints();
                }}
              />
            ))}
            {remaining > 0 ? (
              <li className="text-center text-xs text-zinc-600">
                <Link
                  href="/vault"
                  className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                >
                  +{remaining} more in The Vault
                </Link>
              </li>
            ) : null}
          </ul>
        ) : null}
      </section>
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] max-w-md -translate-x-1/2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center text-sm font-medium text-zinc-900 shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}

function VaultWidgetRow({
  item,
  busy,
  onTempCheckIn,
  onSkip,
}: {
  item: VaultItem;
  busy: boolean;
  onTempCheckIn: (temp: VaultTempValue) => void;
  onSkip: () => void;
}) {
  const [countdown, setCountdown] = useState(() =>
    formatVaultCountdownShort(item.unlock_at),
  );

  useEffect(() => {
    const tick = () => setCountdown(formatVaultCountdownShort(item.unlock_at));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [item.unlock_at]);

  return (
    <li className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 gap-2.5">
          {item.image_url ? (
            <VaultThumbnail
              imageUrl={item.image_url}
              title={item.title}
              size="sm"
            />
          ) : null}
          <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900">{item.title}</p>
          <p className="mt-0.5 text-xs tabular-nums text-zinc-600">
            {formatVaultPrice(item.price_amount, item.currency)} · {countdown}
          </p>
          <div className="mt-1.5">
            <VaultTempTrendBadge
              initialTemp={item.initial_temp}
              currentTemp={item.current_temp}
            />
          </div>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSkip()}
          className="h-9 shrink-0 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white disabled:opacity-50"
        >
          Skipped (+{item.reward_points} pts)
        </button>
      </div>
      <div className="mt-2">
        <VaultTempCheckInBar
          currentTemp={item.current_temp}
          disabled={busy}
          onCheckIn={(temp) => void onTempCheckIn(temp)}
        />
      </div>
    </li>
  );
}