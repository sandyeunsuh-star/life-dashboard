"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import type { VaultCurrency } from "@/lib/vault/constants";
import { recommendVaultPause } from "@/lib/vault/recommend";
import { VAULT_TEMP_DEFAULT } from "@/lib/vault/temperature";
import type { VaultParkDraft } from "@/app/vault/vault-item-modal";
import { formInputMdClass } from "@/lib/ui/form-styles";

type VaultParkBarProps = {
  onOpenFull: (draft: VaultParkDraft) => void;
  onQuickPark: (draft: VaultParkDraft) => void;
};

export function VaultParkBar({ onOpenFull, onQuickPark }: VaultParkBarProps) {
  const [title, setTitle] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [currency, setCurrency] = useState<VaultCurrency>("KRW");

  function buildDraft(): VaultParkDraft | null {
    const amount = Number.parseFloat(priceAmount.replace(/,/g, ""));
    if (!title.trim() || !Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    const rec = recommendVaultPause(amount, currency);
    return {
      title: title.trim(),
      priceAmount: String(amount),
      currency,
      pauseHours: rec.hours,
      rewardPoints: rec.rewardPoints,
      urgeTag: null,
      url: "",
      notes: "",
      initialTemp: VAULT_TEMP_DEFAULT,
    };
  }

  return (
    <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        Quick park
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's tempting you?"
          className={`min-w-0 flex-1 ${formInputMdClass}`}
        />
        <div className="flex flex-wrap items-center gap-2">
          {(["KRW", "USD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                currency === c
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              {c === "KRW" ? "₩" : "$"}
            </button>
          ))}
          <input
            type="text"
            inputMode="decimal"
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            placeholder={currency === "KRW" ? "Amount" : "0.00"}
            className="h-10 w-28 rounded-lg border border-zinc-300 px-2 text-sm tabular-nums"
          />
        </div>
        <button
          type="button"
          disabled={!buildDraft()}
          onClick={() => {
            const draft = buildDraft();
            if (draft) {
              onQuickPark(draft);
              setTitle("");
              setPriceAmount("");
            }
          }}
          className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-40"
        >
          Park
        </button>
        <button
          type="button"
          onClick={() => {
            const draft = buildDraft();
            onOpenFull(
              draft ?? {
                title,
                priceAmount,
                currency,
                pauseHours: 24,
                rewardPoints: 15,
                urgeTag: null,
                url: "",
                notes: "",
                initialTemp: VAULT_TEMP_DEFAULT,
              },
            );
          }}
          className="inline-flex h-10 items-center gap-1 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          <Plus className="size-4" />
          Details
        </button>
      </div>
    </div>
  );
}