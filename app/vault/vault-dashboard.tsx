"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { VaultActiveCard } from "@/app/vault/vault-active-card";
import { VaultItemModal, type VaultParkDraft } from "@/app/vault/vault-item-modal";
import { VaultThumbnail } from "@/app/vault/vault-thumbnail";
import { VaultParkBar } from "@/app/vault/vault-park-bar";
import { computeVaultStatsFromItems } from "@/lib/vault/stats";
import { formatVaultPrice } from "@/lib/vault/format";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { revalidateAfterTidyPoints } from "@/lib/tidy/revalidate-after-points";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  buyVaultItem,
  checkInVaultTemperature,
  reparkVaultItem,
  skipVaultItem,
  upsertVaultItem,
} from "@/lib/supabase/queries/vault";
import { sendVaultItemToTidyRewards } from "@/lib/supabase/queries/tidy-reward-bridge";
import { revalidateTidyGuild } from "@/app/actions/revalidate-tidy-guild";
import type { VaultTempValue } from "@/lib/vault/temperature";
import type { VaultItem, VaultSnapshot } from "@/lib/supabase/types/vault";

type VaultDashboardProps = {
  initial: VaultSnapshot;
};

export function VaultDashboard({ initial }: VaultDashboardProps) {
  const [items, setItems] = useState(initial.items);
  const [stats, setStats] = useState({
    keptSafeKrw: initial.keptSafeKrw,
    keptSafeUsd: initial.keptSafeUsd,
    pausedCount: initial.pausedCount,
    pendingRewardPoints: initial.pendingRewardPoints,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<VaultItem | null>(null);
  const [modalDraft, setModalDraft] = useState<VaultParkDraft | null>(null);
  const [skippedOpen, setSkippedOpen] = useState(false);
  const [boughtOpen, setBoughtOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rewardedOpen, setRewardedOpen] = useState(false);

  const paused = useMemo(
    () => items.filter((i) => i.status === "paused"),
    [items],
  );
  const skipped = useMemo(
    () => items.filter((i) => i.status === "skipped"),
    [items],
  );
  const bought = useMemo(
    () => items.filter((i) => i.status === "bought"),
    [items],
  );
  const rewarded = useMemo(
    () => items.filter((i) => i.status === "rewarded"),
    [items],
  );

  const syncStats = useCallback((nextItems: VaultItem[]) => {
    setStats(computeVaultStatsFromItems(nextItems));
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  const handleSaved = useCallback(
    (item: VaultItem) => {
      setItems((prev) => {
        const exists = prev.some((i) => i.id === item.id);
        const next = exists
          ? prev.map((i) => (i.id === item.id ? item : i))
          : [item, ...prev];
        syncStats(next);
        return next;
      });
    },
    [syncStats],
  );

  const handleQuickPark = useCallback(
    async (draft: VaultParkDraft) => {
      const amount = Number.parseFloat(draft.priceAmount);
      const supabase = createBrowserClientInstance();
      const { data, error } = await upsertVaultItem(supabase, {
        title: draft.title,
        price_amount: amount,
        currency: draft.currency,
        pause_hours: draft.pauseHours,
        reward_points: draft.rewardPoints,
        initial_temp: draft.initialTemp,
      });
      if (error || !data) {
        console.error(formatSupabaseError(error));
        return;
      }
      handleSaved(data);
      showToast(`Parked “${data.title}” — breathe easy.`);
    },
    [handleSaved, showToast],
  );

  const handleSendToRewards = useCallback(
    async (item: VaultItem, points: number) => {
      setBusyId(item.id);
      const supabase = createBrowserClientInstance();
      const { data, vaultItem, error } = await sendVaultItemToTidyRewards(
        supabase,
        item,
        points,
      );
      setBusyId(null);
      if (error || !data || !vaultItem) {
        console.error(formatSupabaseError(error));
        return;
      }
      setItems((prev) => {
        const next = prev.map((i) => (i.id === vaultItem.id ? vaultItem : i));
        syncStats(next);
        return next;
      });
      showToast("Moved to Tidy Guild Rewards!");
      void revalidateTidyGuild();
    },
    [showToast, syncStats],
  );

  const handleSkip = useCallback(
    async (item: VaultItem) => {
      setBusyId(item.id);
      const supabase = createBrowserClientInstance();
      const { data, error } = await skipVaultItem(supabase, item);
      setBusyId(null);
      if (error || !data) {
        console.error(formatSupabaseError(error));
        return;
      }
      setItems((prev) => {
        const next = prev.map((i) => (i.id === data.id ? data : i));
        syncStats(next);
        return next;
      });
      const saved = formatVaultPrice(item.price_amount, item.currency);
      showToast(
        `You kept ${saved} safe and earned +${item.reward_points} Tidy Guild pts!`,
      );
      await revalidateAfterTidyPoints();
    },
    [showToast, syncStats],
  );

  const handleBuy = useCallback(
    async (item: VaultItem) => {
      setBusyId(item.id);
      const supabase = createBrowserClientInstance();
      const { data, error } = await buyVaultItem(supabase, item);
      setBusyId(null);
      if (error || !data) {
        console.error(formatSupabaseError(error));
        return;
      }
      setItems((prev) => {
        const next = prev.map((i) => (i.id === data.id ? data : i));
        syncStats(next);
        return next;
      });
      showToast(`Noted — no shame, just clarity.`);
    },
    [showToast, syncStats],
  );

  const handleTempCheckIn = useCallback(
    async (item: VaultItem, temp: VaultTempValue) => {
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
      setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
    },
    [],
  );

  const handleRepark = useCallback(
    async (item: VaultItem) => {
      setBusyId(item.id);
      const supabase = createBrowserClientInstance();
      const { data, error } = await reparkVaultItem(supabase, item);
      setBusyId(null);
      if (error || !data) {
        console.error(formatSupabaseError(error));
        return;
      }
      setItems((prev) => {
        const next = [data, ...prev];
        syncStats(next);
        return next;
      });
      showToast(`Re-parked “${data.title}” for another cooling-off.`);
    },
    [showToast, syncStats],
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          The Vault
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Park impulse buys, earn Tidy Guild points when you skip.
        </p>
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">
            Total kept safe
          </p>
          <p className="mt-2 text-lg font-semibold tabular-nums text-zinc-900">
            {formatVaultPrice(stats.keptSafeKrw, "KRW")}
          </p>
          <p className="text-lg font-semibold tabular-nums text-zinc-900">
            {formatVaultPrice(stats.keptSafeUsd, "USD")}
          </p>
          <p className="mt-2 text-xs text-zinc-600">
            Every skip is a quiet win.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Currently cooling off
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
            {stats.pausedCount}{" "}
            <span className="text-base font-medium text-zinc-600">
              {stats.pausedCount === 1 ? "item" : "items"}
            </span>
          </p>
          <p className="mt-1 text-sm text-zinc-700">
            <span className="font-semibold tabular-nums text-zinc-900">
              +{stats.pendingRewardPoints}
            </span>{" "}
            Tidy pts waiting if you skip
          </p>
        </div>
      </div>

      <VaultParkBar
        onQuickPark={(draft) => void handleQuickPark(draft)}
        onOpenFull={(draft) => {
          setModalItem(null);
          setModalDraft(draft);
          setModalOpen(true);
        }}
      />

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">
          Cooling off
        </h2>
        <ul className="flex flex-col gap-2">
          {paused.map((item) => (
            <VaultActiveCard
              key={item.id}
              item={item}
              onSkip={() => void handleSkip(item)}
              onBuy={() => void handleBuy(item)}
              onEdit={() => {
                setModalDraft(null);
                setModalItem(item);
                setModalOpen(true);
              }}
              onTempCheckIn={(temp) => void handleTempCheckIn(item, temp)}
              tempChecking={busyId === item.id}
              skipping={busyId === item.id}
              buying={busyId === item.id}
              onSentToRewards={(pts) => void handleSendToRewards(item, pts)}
              sendingToRewards={busyId === item.id}
            />
          ))}
          {paused.length === 0 ? (
            <li className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-600">
              Nothing in the vault — park something tempting above.
            </li>
          ) : null}
        </ul>
      </section>

      <VaultHistorySection
        title="In Reward Shop"
        count={rewarded.length}
        open={rewardedOpen}
        onToggle={() => setRewardedOpen((o) => !o)}
        items={rewarded}
      />

      <VaultHistorySection
        title="Skipped wins"
        count={skipped.length}
        open={skippedOpen}
        onToggle={() => setSkippedOpen((o) => !o)}
        items={skipped}
        renderActions={(item) => (
          <button
            type="button"
            disabled={busyId === item.id}
            onClick={() => void handleRepark(item)}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
          >
            <RotateCcw className="size-3" />
            Re-park
          </button>
        )}
      />

      <VaultHistorySection
        title="Purchased"
        count={bought.length}
        open={boughtOpen}
        onToggle={() => setBoughtOpen((o) => !o)}
        items={bought}
      />

      {toast ? <VaultToast message={toast} /> : null}

      <VaultItemModal
        open={modalOpen}
        item={modalItem}
        initialDraft={modalDraft}
        onClose={() => {
          setModalOpen(false);
          setModalItem(null);
          setModalDraft(null);
        }}
        onSaved={handleSaved}
      />

    </>
  );
}

function VaultHistorySection({
  title,
  count,
  open,
  onToggle,
  items,
  renderActions,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  items: VaultItem[];
  renderActions?: (item: VaultItem) => React.ReactNode;
}) {
  if (count === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-900"
      >
        {title} ({count})
        <ChevronDown
          className={`size-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <ul className="border-t border-zinc-200 bg-white px-3 py-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 py-2.5 last:border-0"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <VaultThumbnail
                  imageUrl={item.image_url}
                  title={item.title}
                  size="md"
                />
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                <p className="text-xs text-zinc-500">
                  {formatVaultPrice(item.price_amount, item.currency)}
                  {item.resolved_at
                    ? ` · ${new Date(item.resolved_at).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              </div>
              {renderActions?.(item)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function VaultToast({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[70] max-w-md -translate-x-1/2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center text-sm font-medium text-zinc-900 shadow-lg"
    >
      {message}
    </div>
  );
}