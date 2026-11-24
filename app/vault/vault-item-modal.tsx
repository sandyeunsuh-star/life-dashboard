"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  VAULT_DURATION_PILLS,
  VAULT_URGE_CHIPS,
  type VaultCurrency,
  type VaultUrgeTag,
} from "@/lib/vault/constants";
import { formatVaultPrice } from "@/lib/vault/format";
import {
  durationPillIdForHours,
  recommendVaultPause,
} from "@/lib/vault/recommend";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { upsertVaultItem } from "@/lib/supabase/queries/vault";
import type { VaultItem } from "@/lib/supabase/types/vault";
import {
  VAULT_TEMP_DEFAULT,
  vaultTempLabel,
  type VaultTempValue,
} from "@/lib/vault/temperature";
import { VaultThumbnailField } from "@/app/vault/vault-thumbnail-field";
import { VaultTempSelector } from "@/app/vault/vault-temperature-ui";
import { uploadVaultImageFromFile } from "@/lib/supabase/storage/vault-images";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";
import { SaveShortcutHint } from "@/lib/ui/save-shortcut-hint";
import {
  invokeFormSubmitHandler,
  useSaveKeyboardShortcut,
} from "@/lib/ui/use-save-keyboard-shortcut";

type VaultItemModalProps = {
  open: boolean;
  item: VaultItem | null;
  initialDraft?: Partial<VaultParkDraft> | null;
  onClose: () => void;
  onSaved: (item: VaultItem) => void;
};

export type VaultParkDraft = {
  title: string;
  priceAmount: string;
  currency: VaultCurrency;
  pauseHours: number;
  rewardPoints: number;
  urgeTag: VaultUrgeTag | null;
  url: string;
  notes: string;
  initialTemp: VaultTempValue;
};

export function VaultItemModal({
  open,
  item,
  initialDraft,
  onClose,
  onSaved,
}: VaultItemModalProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [currency, setCurrency] = useState<VaultCurrency>("KRW");
  const [pauseHours, setPauseHours] = useState(24);
  const [rewardPoints, setRewardPoints] = useState(15);
  const [durationPill, setDurationPill] = useState<string | null>("24h");
  const [urgeTag, setUrgeTag] = useState<VaultUrgeTag | null>(null);
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [initialTemp, setInitialTemp] = useState<VaultTempValue>(VAULT_TEMP_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyRecommendation = useCallback(
    (amount: number, curr: VaultCurrency) => {
      const rec = recommendVaultPause(amount, curr);
      setPauseHours(rec.hours);
      setRewardPoints(rec.rewardPoints);
      setDurationPill(durationPillIdForHours(rec.hours));
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    if (item) {
      setTitle(item.title);
      setPriceAmount(String(item.price_amount));
      setCurrency(item.currency);
      setPauseHours(item.pause_hours);
      setRewardPoints(item.reward_points);
      setDurationPill(durationPillIdForHours(item.pause_hours));
      setUrgeTag(item.urge_tag);
      setUrl(item.url ?? "");
      setImageUrl(item.image_url);
      setPendingImage(null);
      setNotes(item.notes ?? "");
      setInitialTemp(item.initial_temp);
    } else if (initialDraft) {
      setTitle(initialDraft.title ?? "");
      setPriceAmount(initialDraft.priceAmount ?? "");
      setCurrency(initialDraft.currency ?? "KRW");
      setPauseHours(initialDraft.pauseHours ?? 24);
      setRewardPoints(initialDraft.rewardPoints ?? 15);
      setDurationPill(
        durationPillIdForHours(initialDraft.pauseHours ?? 24),
      );
      setUrgeTag(initialDraft.urgeTag ?? null);
      setUrl(initialDraft.url ?? "");
      setImageUrl(null);
      setPendingImage(null);
      setNotes(initialDraft.notes ?? "");
      setInitialTemp(initialDraft.initialTemp ?? VAULT_TEMP_DEFAULT);
    } else {
      setTitle("");
      setPriceAmount("");
      setCurrency("KRW");
      setPauseHours(24);
      setRewardPoints(15);
      setDurationPill("24h");
      setUrgeTag(null);
      setUrl("");
      setImageUrl(null);
      setPendingImage(null);
      setNotes("");
      setInitialTemp(VAULT_TEMP_DEFAULT);
    }
    setError(null);
  }, [open, item, initialDraft]);

  useEffect(() => {
    if (!open || item) return;
    const amount = Number.parseFloat(priceAmount.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) return;
    applyRecommendation(amount, currency);
  }, [priceAmount, currency, open, item, applyRecommendation]);

  const handleSave = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const amount = Number.parseFloat(priceAmount.replace(/,/g, ""));
      if (!title.trim()) {
        setError("Item name is required.");
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Enter a valid price.");
        return;
      }

      setLoading(true);
      setError(null);

      const supabase = createBrowserClientInstance();

      let resolvedImageUrl = imageUrl?.trim() || null;
      if (pendingImage) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Not signed in.");
          setLoading(false);
          return;
        }
        const upload = await uploadVaultImageFromFile(
          supabase,
          user.id,
          pendingImage,
          { vaultItemId: item?.id },
        );
        if (upload.error || !upload.publicUrl) {
          setError(
            upload.error?.message ?? "Could not upload thumbnail.",
          );
          setLoading(false);
          return;
        }
        resolvedImageUrl = upload.publicUrl;
      }

      const { data, error: saveError } = await upsertVaultItem(supabase, {
        id: item?.id,
        title: title.trim(),
        price_amount: amount,
        currency,
        pause_hours: pauseHours,
        reward_points: rewardPoints,
        urge_tag: urgeTag,
        url: url.trim() || null,
        image_url: resolvedImageUrl,
        notes: notes.trim() || null,
        initial_temp: item ? undefined : initialTemp,
      });

      setLoading(false);
      if (saveError || !data) {
        setError(formatSupabaseError(saveError));
        return;
      }
      onSaved(data);
      onClose();
    },
    [
      title,
      priceAmount,
      currency,
      pauseHours,
      rewardPoints,
      urgeTag,
      url,
      imageUrl,
      pendingImage,
      notes,
      initialTemp,
      item?.id,
      onClose,
      onSaved,
    ],
  );

  const saveViaShortcut = useCallback(() => {
    invokeFormSubmitHandler(handleSave);
  }, [handleSave]);

  useSaveKeyboardShortcut(open, loading, saveViaShortcut);

  if (!open) return null;

  const parsedPreview = Number.parseFloat(priceAmount.replace(/,/g, ""));
  const pricePreview =
    Number.isFinite(parsedPreview) && parsedPreview > 0
      ? formatVaultPrice(parsedPreview, currency)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40"
        aria-label="Close"
        onClick={onClose}
      />
      <form
        ref={formRef}
        id={formId}
        onSubmit={handleSave}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-zinc-900">
              {item ? "Edit temptation" : "Park in the vault"}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-600">
              No judgment—just a pause and a reward if you skip.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vault-title" className={formLabelClass}>
              Item name
            </label>
            <input
              id="vault-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={formInputMdClass}
              required
              autoFocus
            />
          </div>

          {item ? (
            <p className="text-xs text-zinc-600">
              Desire temp: {vaultTempLabel(item.initial_temp)} at park →{" "}
              {vaultTempLabel(item.current_temp)} now (check in on the card)
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <span className={formLabelClass}>Initial desire temp</span>
              <VaultTempSelector
                value={initialTemp}
                onChange={setInitialTemp}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className={formLabelClass}>Price</span>
            <div className="flex flex-wrap gap-2">
              {(["KRW", "USD"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    currency === c
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                  }`}
                >
                  {c === "KRW" ? "₩ KRW" : "$ USD"}
                </button>
              ))}
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
              placeholder={currency === "KRW" ? "45000" : "38.00"}
              className={formInputMdClass}
            />
            {pricePreview ? (
              <p className="text-xs text-zinc-500">Preview: {pricePreview}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <span className={formLabelClass}>Cooling-off &amp; reward</span>
            <div className="flex flex-wrap gap-2">
              {VAULT_DURATION_PILLS.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setDurationPill(pill.id);
                    setPauseHours(pill.hours);
                    if (pill.hours === 24) setRewardPoints(15);
                    else if (pill.hours === 48) setRewardPoints(25);
                    else if (pill.hours === 72) setRewardPoints(25);
                    else if (pill.hours === 168) setRewardPoints(40);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    durationPill === pill.id
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600">
              Suggested reward:{" "}
              <span className="font-semibold text-zinc-900">
                +{rewardPoints} Tidy pts
              </span>{" "}
              if you skip
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="vault-reward-override" className="text-xs text-zinc-600">
                Override pts
              </label>
              <input
                id="vault-reward-override"
                type="number"
                min={1}
                value={rewardPoints}
                onChange={(e) =>
                  setRewardPoints(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
                }
                className="h-9 w-20 rounded-lg border border-zinc-300 px-2 text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className={formLabelClass}>Urge check-in (optional)</span>
            <div className="flex flex-wrap gap-2">
              {VAULT_URGE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() =>
                    setUrgeTag((prev) => (prev === chip ? null : chip))
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    urgeTag === chip
                      ? "border-zinc-700 bg-zinc-100 text-zinc-900"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-white"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <VaultThumbnailField
            open={open}
            imageUrl={imageUrl}
            pendingFile={pendingImage}
            onImageUrlChange={setImageUrl}
            onPendingFileChange={setPendingImage}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="vault-url" className={formLabelClass}>
              Product link (optional)
            </label>
            <input
              id="vault-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              className={formInputMdClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="vault-notes" className={formLabelClass}>
              Notes (optional)
            </label>
            <textarea
              id="vault-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={formInputMdClass}
            />
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
          <SaveShortcutHint />
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="h-10 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Saving…" : item ? "Save" : "Park it"}
          </button>
        </div>
      </form>
    </div>
  );
}