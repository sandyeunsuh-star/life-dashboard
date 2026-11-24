"use client";

import { useCallback, useEffect, useState } from "react";

import { TidyGoalProgressBars } from "@/app/tidy-guild/tidy-goal-progress-bars";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { fetchTidyGoalProgress } from "@/lib/supabase/queries/tidy-goals";
import type { TidyGoalProgress } from "@/lib/supabase/types/tidy-goals";

const DEFAULT_PROGRESS: TidyGoalProgress = {
  daily_goal: 50,
  monthly_goal: 1200,
  today_points: 0,
  today_wins: 0,
  week_points: 0,
  week_wins: 0,
  month_points: 0,
  month_wins: 0,
};

type TidyGuildProgressStripProps = {
  refreshToken?: number;
};

export function TidyGuildProgressStrip({
  refreshToken = 0,
}: TidyGuildProgressStripProps) {
  const [progress, setProgress] = useState<TidyGoalProgress>(DEFAULT_PROGRESS);

  const reload = useCallback(async () => {
    const supabase = createBrowserClientInstance();
    const { data } = await fetchTidyGoalProgress(supabase);
    if (data) setProgress(data);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, refreshToken]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
      <TidyGoalProgressBars
        progress={progress}
        compact
        onProgressChange={setProgress}
      />
    </section>
  );
}