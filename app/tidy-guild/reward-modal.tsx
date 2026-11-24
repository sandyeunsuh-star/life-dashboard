"use client";

import { ImagePlus, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { compressToWebpCover } from "@/lib/supabase/images/compress-cover";
import { upsertTidyReward } from "@/lib/supabase/queries/tidy";
import {
  getTidyRewardPublicUrl,
  tidyRewardImagePath,
  uploadTidyRewardImage,
} from "@/lib/supabase/storage/tidy-rewards";
import type { TidyRewardTier } from "@/lib/tidy/constants";
import { TIDY_REWARD_TIERS } from "@/lib/tidy/constants";
import type { TidyReward } from "@/lib/supabase/types/tidy";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";
import { SaveShortcutHint } from "@/lib/ui/save-shortcut-hint";
import {
  invokeFormSubmitHandler,
  useSaveKeyboardShortcut,
} from "@/lib/ui/use-save-keyboard-shortcut";

type RewardModalProps = {
  open: boolean;
  reward: TidyReward | null;
  onClose: () => void;
  onSaved: (reward: TidyReward) => void;
};

export function RewardModal({
  open,
  reward,
  onClose,
  onSaved,
}: RewardModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  const [title, setTitle] = useState("");
  const [pointsCost, setPointsCost] = useState(50);
  const [linkUrl, setLinkUrl] = useState("");
  const [isGoal, setIsGoal] = useState(false);
  const [isRepeatable, setIsRepeatable] = useState(false);
  const [tier, setTier] = useState<TidyRewardTier>("medium");
  const [isMystery, setIsMystery] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (reward) {
      setTitle(reward.title);
      setPointsCost(reward.points_cost);
      setLinkUrl(reward.link_url ?? "");
      setIsGoal(reward.is_goal);
      setIsRepeatable(reward.is_repeatable);
      setTier(reward.tier ?? "medium");
      setIsMystery(reward.is_mystery ?? false);
      setImagePath(reward.image_path);
      setPendingFile(null);
      if (reward.image_path) {
        const supabase = createBrowserClientInstance();
        setPreviewUrl(getTidyRewardPublicUrl(supabase, reward.image_path));
      } else {
        setPreviewUrl(null);
      }
    } else {
      setTitle("");
      setPointsCost(50);
      setLinkUrl("");
      setIsGoal(false);
      setIsRepeatable(false);
      setTier("medium");
      setIsMystery(false);
      setImagePath(null);
      setPreviewUrl(null);
      setPendingFile(null);
    }
    setError(null);
  }, [open, reward]);

  useEffect(() => {
    if (!pendingFile) return;
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const handleSave = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!title.trim()) {
        setError("Reward title is required.");
        return;
      }
      if (pointsCost < 1) {
        setError("Point cost must be at least 1.");
        return;
      }

      setLoading(true);
      setError(null);

      const supabase = createBrowserClientInstance();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not signed in.");
        setLoading(false);
        return;
      }

      let nextImagePath = imagePath;

      try {
        if (pendingFile) {
          const compressed = await compressToWebpCover(pendingFile);
          const fileId = crypto.randomUUID();
          const path = tidyRewardImagePath(user.id, fileId);
          const up = await uploadTidyRewardImage(supabase, path, compressed);
          if (up.error) throw up.error;
          nextImagePath = path;
        }

        const { data, error: saveError } = await upsertTidyReward(supabase, {
          id: reward?.id,
          title: title.trim(),
          points_cost: pointsCost,
          image_path: nextImagePath,
          link_url: linkUrl.trim() || null,
          is_goal: isGoal,
          is_repeatable: isRepeatable,
          tier,
          is_mystery: isMystery,
        });

        if (saveError || !data) {
          setError(formatSupabaseError(saveError));
          return;
        }

        onSaved(data);
        onClose();
      } catch (err) {
        setError(formatSupabaseError(err));
      } finally {
        setLoading(false);
      }
    },
    [
      title,
      pointsCost,
      linkUrl,
      isGoal,
      isRepeatable,
      tier,
      isMystery,
      imagePath,
      pendingFile,
      reward,
      onSaved,
      onClose,
    ],
  );

  const saveViaShortcut = useCallback(() => {
    invokeFormSubmitHandler(handleSave);
  }, [handleSave]);

  useSaveKeyboardShortcut(open, loading, saveViaShortcut);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {reward ? "Edit reward" : "Add reward"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5">
            <X className="size-5 text-zinc-600" />
          </button>
        </div>

        <form
          ref={formRef}
          id={formId}
          onSubmit={handleSave}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5"
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reward-title" className={formLabelClass}>
                Reward title
              </label>
              <input
                id="reward-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={formInputMdClass}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reward-cost" className={formLabelClass}>
                Point cost
              </label>
              <input
                id="reward-cost"
                type="number"
                min={1}
                value={pointsCost}
                onChange={(e) =>
                  setPointsCost(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
                }
                className={formInputMdClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className={formLabelClass}>Motivator photo</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) setPendingFile(file);
                }}
              />
              {previewUrl ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    decoding="async"
                  />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50">
                  <ImagePlus className="size-8 text-zinc-400" aria-hidden />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="h-10 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Upload photo
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reward-link" className={formLabelClass}>
                Optional link URL
              </label>
              <input
                id="reward-link"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://"
                className={formInputMdClass}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-900">
              <input
                type="checkbox"
                checked={isGoal}
                onChange={(e) => setIsGoal(e.target.checked)}
                className="size-4 rounded border-zinc-400"
              />
              Pin as active goal
            </label>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reward-tier" className={formLabelClass}>
                Reward tier
              </label>
              <select
                id="reward-tier"
                value={tier}
                onChange={(e) => setTier(e.target.value as TidyRewardTier)}
                className={formInputMdClass}
              >
                {TIDY_REWARD_TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-900">
              <input
                type="checkbox"
                checked={isRepeatable}
                onChange={(e) => setIsRepeatable(e.target.checked)}
                className="size-4 rounded border-zinc-400"
              />
              Repeatable reward
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-900">
              <input
                type="checkbox"
                checked={isMystery}
                onChange={(e) => setIsMystery(e.target.checked)}
                className="size-4 rounded border-zinc-400"
              />
              Include in Mystery Box
            </label>
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
              {loading ? "Saving…" : "Save reward"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}