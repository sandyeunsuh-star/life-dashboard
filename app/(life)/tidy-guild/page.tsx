import { connection } from "next/server";
import { Suspense } from "react";

import { TidyGuildDashboard } from "@/app/tidy-guild/tidy-guild-dashboard";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { getMondayOfWeek, toDateString } from "@/lib/weekly/dates";
import { fetchTidyGuildSnapshot } from "@/lib/supabase/queries/tidy";
import { createServerClientInstance } from "@/lib/supabase/server";

export const instant = false;

async function TidyGuildContent() {
  await connection();

  const supabase = await createServerClientInstance();
  const { data, error } = await fetchTidyGuildSnapshot(supabase);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  const fallbackNow = new Date();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 pb-28">
      <TidyGuildDashboard
        initial={
          data ?? {
            tasks: [],
            rewards: [],
            pointBalance: 0,
            anytimeClaimCounts: {},
            recentPointWins: [],
            referenceNowIso: fallbackNow.toISOString(),
            todayDateIso: toDateString(fallbackNow),
            weekStart: toDateString(getMondayOfWeek(fallbackNow)),
            weeklySchedule: {},
            habits: [],
          }
        }
      />
    </main>
  );
}

function TidyGuildFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  );
}

export default function TidyGuildPage() {
  return (
    <Suspense fallback={<TidyGuildFallback />}>
      <TidyGuildContent />
    </Suspense>
  );
}