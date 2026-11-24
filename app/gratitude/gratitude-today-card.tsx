"use client";

import { useCallback, useEffect, useId, useState } from "react";

import { GratitudePhotoField } from "@/app/gratitude/gratitude-photo-field";
import { formatGratitudeEntryDate } from "@/lib/gratitude/format-entry-date";
import { gratitudeHasSaveableContent } from "@/lib/gratitude/validation";
import { todayLocalDateIso, yesterdayLocalDateIso } from "@/lib/tidy/backdate-dates";
import { revalidateAfterTidyPoints } from "@/lib/tidy/revalidate-after-points";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { saveGratitudeEntry } from "@/lib/supabase/queries/gratitude";
import { uploadGratitudeImageFromFile } from "@/lib/supabase/storage/gratitude-images";
import type { GratitudeEntryRow } from "@/lib/supabase/types/gratitude";
import { SaveShortcutHint } from "@/lib/ui/save-shortcut-hint";
import {
  invokeFormSubmitHandler,
  useSaveKeyboardShortcut,
} from "@/lib/ui/use-save-keyboard-shortcut";
import { requireAuthUser } from "@/lib/supabase/require-auth-user";

type GratitudeTodayCardProps = {
  todayDate: string;
  initialEntry: GratitudeEntryRow | null;
  onSaved: (result: { entry: GratitudeEntryRow; pointsAwarded: boolean }) => void;
};

export function GratitudeTodayCard({
  todayDate,
  initialEntry,
  onSaved,
}: GratitudeTodayCardProps) {
  const formId = useId();
  const [entryDate, setEntryDate] = useState(
    initialEntry?.entry_date ?? todayDate,
  );
  const [favoriteThing, setFavoriteThing] = useState(
    initialEntry?.favorite_thing ?? "",
  );
  const [favoriteWhy, setFavoriteWhy] = useState(
    initialEntry?.favorite_why ?? "",
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    initialEntry?.favorite_photo_url ?? null,
  );
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [glimmer1, setGlimmer1] = useState(initialEntry?.glimmer_1 ?? "");
  const [glimmer2, setGlimmer2] = useState(initialEntry?.glimmer_2 ?? "");
  const [glimmer3, setGlimmer3] = useState(initialEntry?.glimmer_3 ?? "");
  const [entryId, setEntryId] = useState(initialEntry?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntryDate(initialEntry?.entry_date ?? todayDate);
    setFavoriteThing(initialEntry?.favorite_thing ?? "");
    setFavoriteWhy(initialEntry?.favorite_why ?? "");
    setPhotoUrl(initialEntry?.favorite_photo_url ?? null);
    setPendingFile(null);
    setGlimmer1(initialEntry?.glimmer_1 ?? "");
    setGlimmer2(initialEntry?.glimmer_2 ?? "");
    setGlimmer3(initialEntry?.glimmer_3 ?? "");
    setEntryId(initialEntry?.id ?? null);
    setError(null);
  }, [initialEntry, todayDate]);

  const handleSave = useCallback(async () => {
    if (
      !gratitudeHasSaveableContent({
        favorite_thing: favoriteThing,
        glimmer_1: glimmer1,
        glimmer_2: glimmer2,
        glimmer_3: glimmer3,
      })
    ) {
      setError("Add a favorite thing or at least one glimmer");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createBrowserClientInstance();
    const auth = await requireAuthUser(supabase);
    if (auth.error || !auth.user) {
      setLoading(false);
      setError("Not signed in");
      return;
    }

    let nextPhotoUrl = photoUrl;
    if (pendingFile) {
      const { publicUrl, error: upErr } = await uploadGratitudeImageFromFile(
        supabase,
        auth.user.id,
        pendingFile,
        entryId ?? undefined,
      );
      if (upErr || !publicUrl) {
        setLoading(false);
        setError(formatSupabaseError(upErr) || "Photo upload failed");
        return;
      }
      nextPhotoUrl = publicUrl;
    }

    const { data, error: saveErr } = await saveGratitudeEntry(supabase, {
      id: entryId ?? undefined,
      entry_date: entryDate,
      favorite_thing: favoriteThing,
      favorite_why: favoriteWhy,
      favorite_photo_url: nextPhotoUrl,
      glimmer_1: glimmer1,
      glimmer_2: glimmer2,
      glimmer_3: glimmer3,
    });

    setLoading(false);
    if (saveErr || !data) {
      setError(formatSupabaseError(saveErr) || "Could not save");
      return;
    }

    setEntryId(data.entry.id);
    setPhotoUrl(data.entry.favorite_photo_url);
    setPendingFile(null);
    onSaved(data);
    if (data.pointsAwarded) {
      await revalidateAfterTidyPoints();
    }
  }, [
    entryDate,
    entryId,
    favoriteThing,
    favoriteWhy,
    glimmer1,
    glimmer2,
    glimmer3,
    onSaved,
    pendingFile,
    photoUrl,
  ]);

  const saveViaShortcut = useCallback(() => {
    invokeFormSubmitHandler(() => void handleSave());
  }, [handleSave]);

  useSaveKeyboardShortcut(true, loading, saveViaShortcut);

  const inputClass =
    "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400";

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSave();
      }}
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-500">Today&apos;s entry</p>
          <p className="text-sm font-medium text-zinc-900">
            {formatGratitudeEntryDate(entryDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEntryDate(todayDate)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
              entryDate === todayDate
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 text-zinc-700"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setEntryDate(yesterdayLocalDateIso())}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
              entryDate === yesterdayLocalDateIso()
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 text-zinc-700"
            }`}
          >
            Yesterday
          </button>
          <input
            type="date"
            value={entryDate}
            max={todayDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-900"
          />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-zinc-800">
            One favorite thing
          </span>
          <input
            value={favoriteThing}
            onChange={(e) => setFavoriteThing(e.target.value)}
            placeholder="Something you own or experienced that makes you smile"
            className={`${inputClass} mt-1.5`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">Why it makes me smile</span>
          <textarea
            value={favoriteWhy}
            onChange={(e) => setFavoriteWhy(e.target.value)}
            rows={2}
            className={`${inputClass} mt-1 resize-y`}
          />
        </label>

        <GratitudePhotoField
          active
          photoUrl={photoUrl}
          pendingFile={pendingFile}
          onPhotoUrlChange={setPhotoUrl}
          onPendingFileChange={setPendingFile}
        />

        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-800">3 daily glimmers</p>
          <p className="text-xs text-zinc-500">
            Tiny happy moments — fill as many as you like.
          </p>
          <input
            value={glimmer1}
            onChange={(e) => setGlimmer1(e.target.value)}
            placeholder="Glimmer 1"
            className={inputClass}
          />
          <input
            value={glimmer2}
            onChange={(e) => setGlimmer2(e.target.value)}
            placeholder="Glimmer 2"
            className={inputClass}
          />
          <input
            value={glimmer3}
            onChange={(e) => setGlimmer3(e.target.value)}
            placeholder="Glimmer 3"
            className={inputClass}
          />
        </div>
      </div>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
        <SaveShortcutHint />
        <div className="flex items-center gap-2">
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {loading ? "Saving…" : "Save entry"}
          </button>
        </div>
      </footer>
    </form>
  );
}

function motion({
  classNameName,
  children,
}: {
  classNameName: string;
  children: React.ReactNode;
}) {
  return <div className={classNameName}>{children}</div>;
}