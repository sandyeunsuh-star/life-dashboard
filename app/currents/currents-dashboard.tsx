"use client";

import { Plus } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { CurrentsEntryCard } from "@/app/currents/currents-entry-card";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { deleteCurrentsEntry } from "@/lib/supabase/queries/currents";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { currentPeriodYm, periodLabelFromYm } from "@/lib/currents/period";
import type { CurrentsEntryRow } from "@/lib/supabase/types/currents";
import type { CurrentsDigitalPaper } from "@/lib/supabase/types/currents-paper";

type CurrentsDashboardProps = {
  initialEntries: CurrentsEntryRow[];
  serverCurrentYm: string;
  digitalPapers: CurrentsDigitalPaper[];
};

type NewDraft = {
  periodYm: string;
  key: string;
};

function sortEntries(list: CurrentsEntryRow[]) {
  return [...list].sort(
    (a, b) =>
      new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
  );
}

function uniquePeriodYms(entries: CurrentsEntryRow[]): string[] {
  const set = new Set<string>();
  for (const e of entries) set.add(e.period_ym);
  return [...set].sort((a, b) => (a < b ? 1 : -1));
}

export function CurrentsDashboard({
  initialEntries,
  serverCurrentYm,
  digitalPapers,
}: CurrentsDashboardProps) {
  const [entries, setEntries] = useState(() => sortEntries(initialEntries));
  const [toast, setToast] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState<NewDraft | null>(null);
  const draftRef = useRef<HTMLDivElement>(null);

  const currentYm = serverCurrentYm || currentPeriodYm();
  const currentLabel = periodLabelFromYm(currentYm);

  const currentMonthEntries = useMemo(
    () => entries.filter((e) => e.period_ym === currentYm),
    [entries, currentYm],
  );

  const hasCurrentMonth = currentMonthEntries.length > 0;

  const pastPeriodYms = useMemo(() => {
    return uniquePeriodYms(entries.filter((e) => e.period_ym !== currentYm));
  }, [entries, currentYm]);

  const [archiveYm, setArchiveYm] = useState<string | null>(
    pastPeriodYms[0] ?? null,
  );

  const archiveEntries = useMemo(() => {
    if (!archiveYm) return [];
    return entries.filter((e) => e.period_ym === archiveYm);
  }, [archiveYm, entries]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  const handleSaved = useCallback((row: CurrentsEntryRow) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== row.id);
      next.push(row);
      return sortEntries(next);
    });
    setNewDraft(null);
  }, []);

  const handleDeleted = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this Currents entry? This cannot be undone.")) {
        return;
      }
      const supabase = createBrowserClientInstance();
      const { error } = await deleteCurrentsEntry(supabase, id);
      if (error) {
        showToast(formatSupabaseError(error));
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== id));
      showToast("Entry deleted");
    },
    [showToast],
  );

  function startNewEntry(periodYm: string) {
    setNewDraft({
      periodYm,
      key: crypto.randomUUID(),
    });
    requestAnimationFrame(() => {
      draftRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[10px] font-medium tracking-[0.2em] text-stone-500 uppercase">
            Memory keeping
          </p>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-zinc-900 sm:text-4xl">
            Currents
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-stone-600">
            Nine prompts, a mood note, and a contact sheet — as many dated spreads
            per month as life needs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => startNewEntry(currentYm)}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          <Plus className="size-4" aria-hidden />
          New Currents entry
        </button>
      </header>

      {!hasCurrentMonth && !newDraft ? (
        <CurrentsMonthBanner
          monthLabel={currentLabel}
          onStart={() => startNewEntry(currentYm)}
        />
      ) : null}

      {newDraft ? (
        <section ref={draftRef} className="space-y-3">
          <p className="text-[10px] font-medium tracking-[0.2em] text-stone-500 uppercase">
            New spread
          </p>
          <CurrentsEntryCard
            key={newDraft.key}
            entry={null}
            periodYm={newDraft.periodYm}
            digitalPapers={digitalPapers}
            defaultExpanded
            onSaved={handleSaved}
            onCancelDraft={() => setNewDraft(null)}
            onToast={showToast}
          />
        </section>
      ) : null}

      <section className="space-y-4">
        <p className="text-[10px] font-medium tracking-[0.2em] text-stone-500 uppercase">
          {currentLabel}
        </p>
        {currentMonthEntries.length === 0 ? (
          <p className="text-sm text-stone-500">
            No spreads yet for this month — start one above.
          </p>
        ) : (
          <div className="space-y-6">
            {currentMonthEntries.map((entry) => (
              <CurrentsEntryCard
                key={entry.id}
                entry={entry}
                periodYm={entry.period_ym}
                digitalPapers={digitalPapers}
                onSaved={handleSaved}
                onDeleted={handleDeleted}
                onToast={showToast}
              />
            ))}
          </div>
        )}
      </section>

      {pastPeriodYms.length > 0 || archiveYm ? (
        <section className="space-y-4 border-t border-stone-300/60 pt-8">
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] text-stone-500 uppercase">
              Past months
            </p>
            <h2 className="font-serif text-xl font-medium text-zinc-900">Archive</h2>
          </div>

          {pastPeriodYms.length > 0 ? (
            <ArchiveMonthPills
              periods={pastPeriodYms}
              selected={archiveYm}
              onSelect={setArchiveYm}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex flex-wrap items-center gap-2 text-xs text-stone-600">
              <span className="text-[10px] font-medium tracking-[0.2em] uppercase">
                Backfill month
              </span>
              <input
                type="month"
                className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm text-zinc-900"
                onChange={(e) => {
                  const ym = e.target.value;
                  if (!ym || ym === currentYm) return;
                  setArchiveYm(ym);
                }}
              />
            </label>
            {archiveYm ? (
              <button
                type="button"
                onClick={() => startNewEntry(archiveYm)}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-stone-50"
              >
                + New entry for {periodLabelFromYm(archiveYm)}
              </button>
            ) : null}
          </div>

          {archiveYm ? (
            archiveEntries.length > 0 ? (
              <div className="space-y-6">
                {archiveEntries.map((entry) => (
                  <CurrentsEntryCard
                    key={entry.id}
                    entry={entry}
                    periodYm={entry.period_ym}
                    digitalPapers={digitalPapers}
                    onSaved={handleSaved}
                    onDeleted={handleDeleted}
                    onToast={showToast}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">
                No entries for {periodLabelFromYm(archiveYm)} yet.
              </p>
            )
          ) : (
            <p className="text-sm text-stone-500">Choose a month to browse spreads.</p>
          )}
        </section>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function CurrentsMonthBanner({
  monthLabel,
  onStart,
}: {
  monthLabel: string;
  onStart: () => void;
}) {
  const monthWord = monthLabel.split(" ")[0] ?? "This";
  return (
    <div className="rounded-2xl border border-stone-200/90 bg-[#FCFBF9] px-5 py-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
      <p className="text-sm leading-relaxed text-stone-600">
        Your{" "}
        <span className="font-serif text-base text-zinc-900">{monthLabel}</span>{" "}
        Currents issue is unwritten — capture what life feels like right now.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-3 shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 sm:mt-0"
      >
        Start {monthWord} issue
      </button>
    </div>
  );
}

function ArchiveMonthPills({
  periods,
  selected,
  onSelect,
}: {
  periods: string[];
  selected: string | null;
  onSelect: (ym: string) => void;
}) {
  if (periods.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Archive months">
      {periods.map((ym) => {
        const active = ym === selected;
        const short = periodLabelFromYm(ym);
        return (
          <button
            key={ym}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(ym)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-stone-300/80 bg-white/80 text-stone-700 hover:border-stone-400 hover:bg-white"
            }`}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}