import { connection } from "next/server";
import { Suspense } from "react";

import { WeeklyDashboard } from "@/app/weekly/weekly-dashboard";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { listShipments } from "@/lib/supabase/queries/shipments";
import { getOrCreateUserSettings } from "@/lib/supabase/queries/user-settings";
import {
  ensureCurrentWeekPlan,
  getWeeklyPlanByWeekStart,
  listWeeklyPlanWeekStarts,
} from "@/lib/supabase/queries/weekly-plans";
import { createServerClientInstance } from "@/lib/supabase/server";
import { getMondayOfWeek, toDateString } from "@/lib/weekly/dates";

export const instant = false;

type WeeklyPageProps = {
  searchParams: Promise<{ week?: string }>;
};

async function WeeklyContent({ weekParam }: { weekParam?: string }) {
  await connection();

  const supabase = await createServerClientInstance();

  const [{ data: weekStarts, error: weeksError }, settingsResult, shipmentsResult] =
    await Promise.all([
      listWeeklyPlanWeekStarts(supabase),
      getOrCreateUserSettings(supabase),
      listShipments(supabase),
    ]);

  if (weeksError) throw new Error(formatSupabaseError(weeksError));
  if (settingsResult.error) {
    throw new Error(formatSupabaseError(settingsResult.error));
  }
  if (shipmentsResult.error) {
    throw new Error(formatSupabaseError(shipmentsResult.error));
  }

  const defaultWeek = toDateString(getMondayOfWeek(new Date()));
  let weekStart = weekParam ?? defaultWeek;

  let planResult = await getWeeklyPlanByWeekStart(supabase, weekStart);
  if (planResult.error) throw new Error(formatSupabaseError(planResult.error));

  if (!planResult.data && weekStart === defaultWeek) {
    const ensured = await ensureCurrentWeekPlan(supabase);
    if (ensured.error) throw new Error(formatSupabaseError(ensured.error));
    planResult = ensured;
    weekStart = ensured.data?.week_start ?? weekStart;
  }

  const allWeeks = weekStarts ?? [];
  if (planResult.data && !allWeeks.includes(planResult.data.week_start)) {
    allWeeks.unshift(planResult.data.week_start);
  }
  allWeeks.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  if (!planResult.data) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <p className="text-sm text-zinc-600">No plan for this week yet.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <WeeklyDashboard
        initialPlan={planResult.data}
        weekStarts={allWeeks}
        settings={settingsResult.data!}
        initialShipments={shipmentsResult.data ?? []}
      />
    </main>
  );
}

function WeeklyFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  );
}

export default async function WeeklyPage({ searchParams }: WeeklyPageProps) {
  const { week } = await searchParams;

  return (
    <Suspense fallback={<WeeklyFallback />}>
      <WeeklyContent weekParam={week} />
    </Suspense>
  );
}