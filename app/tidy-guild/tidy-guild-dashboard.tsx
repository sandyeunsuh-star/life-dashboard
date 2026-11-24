"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ActiveGoalBanner } from "@/app/tidy-guild/active-goal-banner";
import { MysteryBox } from "@/app/tidy-guild/mystery-box";
import { RewardModal } from "@/app/tidy-guild/reward-modal";
import { TidyRewardShopCard } from "@/app/tidy-guild/tidy-reward-shop-card";
import { LogWinBar } from "@/app/tidy-guild/log-win-bar";
import { RecentPointWins } from "@/app/tidy-guild/recent-point-wins";
import { TidyGoalProgressBars } from "@/app/tidy-guild/tidy-goal-progress-bars";
import { HabitIncubator } from "@/app/tidy-guild/habit-incubator";
import { HabitModal } from "@/app/tidy-guild/habit-modal";
import { TidyGuildHistory } from "@/app/tidy-guild/tidy-guild-history";
import { TidyQuestSections } from "@/app/tidy-guild/tidy-quest-sections";
import { TaskModal } from "@/app/tidy-guild/task-modal";
import { HABIT_INCUBATOR_MAX } from "@/lib/tidy/habit-constants";
import { resolveActiveGoalReward } from "@/lib/tidy/active-goal";
import type { TidyRewardTierFilter } from "@/lib/tidy/constants";
import { TIDY_REWARD_TIER_FILTERS } from "@/lib/tidy/constants";
import { allMicroStepsComplete } from "@/lib/tidy/micro-steps";
import { isTaskEffectivelyComplete } from "@/lib/tidy/task-reset";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  deleteTidyReward,
  claimTidyAnytimeTask,
  deleteTidyTask,
  logTidyQuestBackdate,
  redeemTidyReward,
  setTidyRewardGoal,
  toggleTidyMicroStep,
  fetchRecentPointWins,
  toggleTidyTaskComplete,
} from "@/lib/supabase/queries/tidy";
import { updateTidyPointLogCreatedAt } from "@/lib/supabase/queries/tidy-point-log-date";
import {
  undoLatestAnytimeClaim,
  undoTidyPointWin,
} from "@/lib/supabase/queries/tidy-point-undo";
import {
  createdAtLocalNoonIso,
  todayLocalDateIso,
} from "@/lib/tidy/backdate-dates";
import { revalidateAfterTidyPoints } from "@/lib/tidy/revalidate-after-points";
import type { DayKey } from "@/lib/weekly/constants";
import { getMondayOfWeek, toDateString } from "@/lib/weekly/dates";
import { buildTidyWeeklyScheduleMap } from "@/lib/weekly/tidy-schedule";
import {
  fetchCurrentWeekPlanForTidy,
  stampAnytimeClaimOnWeekly,
  syncTidyCompletionToWeekly,
} from "@/lib/supabase/queries/weekly-tidy-sync";
import {
  fetchTidyGoalProgress,
  fetchTidyPointHistoryByDay,
  type TidyHistoryDay,
} from "@/lib/supabase/queries/tidy-goals";
import type { TidyGoalProgress } from "@/lib/supabase/types/tidy-goals";
import type { TidyHabitRow } from "@/lib/supabase/types/tidy-habit";
import type {
  TidyGuildSnapshot,
  TidyPointWin,
  TidyReward,
  TidyTask,
} from "@/lib/supabase/types/tidy";

type GuildView = "quests" | "habits" | "history";

const DEFAULT_GOAL_PROGRESS: TidyGoalProgress = {
  daily_goal: 50,
  monthly_goal: 1200,
  today_points: 0,
  today_wins: 0,
  week_points: 0,
  week_wins: 0,
  month_points: 0,
  month_wins: 0,
};

type TidyGuildDashboardProps = {
  initial: TidyGuildSnapshot;
};

export function TidyGuildDashboard({ initial }: TidyGuildDashboardProps) {
  const [tasks, setTasks] = useState(initial.tasks);
  const [rewards, setRewards] = useState(initial.rewards);
  const [pointBalance, setPointBalance] = useState(initial.pointBalance);
  const [recentPointWins, setRecentPointWins] = useState<TidyPointWin[]>(
    initial.recentPointWins ?? [],
  );
  const [anytimeClaimCounts, setAnytimeClaimCounts] = useState(
    initial.anytimeClaimCounts ?? {},
  );
  const [balancePulse, setBalancePulse] = useState(false);
  const [guildView, setGuildView] = useState<GuildView>("quests");
  const [goalProgress, setGoalProgress] =
    useState<TidyGoalProgress>(DEFAULT_GOAL_PROGRESS);
  const [historyDays, setHistoryDays] = useState<TidyHistoryDay[]>([]);
  const [quickWinsOnly, setQuickWinsOnly] = useState(false);
  const [rewardTierFilter, setRewardTierFilter] =
    useState<TidyRewardTierFilter>("all");
  const [habits, setHabits] = useState<TidyHabitRow[]>(initial.habits ?? []);
  const [taskModal, setTaskModal] = useState<TidyTask | null | "new">(null);
  const [rewardModal, setRewardModal] = useState<TidyReward | null | "new">(null);
  const [habitModal, setHabitModal] = useState<TidyHabitRow | null | "new">(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);
  const [undoingPointId, setUndoingPointId] = useState<string | null>(null);
  const [changingLogDateId, setChangingLogDateId] = useState<string | null>(
    null,
  );
  const [undoingClaimTaskId, setUndoingClaimTaskId] = useState<string | null>(
    null,
  );
  const [backdatingTaskId, setBackdatingTaskId] = useState<string | null>(null);
  const [liveTodayDateIso, setLiveTodayDateIso] = useState(
    initial.todayDateIso || todayLocalDateIso(),
  );
  const [logDateYmd, setLogDateYmd] = useState(
    initial.todayDateIso || todayLocalDateIso(),
  );
  const [redeemingGoal, setRedeemingGoal] = useState(false);
  const [removingRewardId, setRemovingRewardId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(initial.weekStart ?? "");
  const [weeklySchedule, setWeeklySchedule] = useState<
    Record<string, DayKey>
  >(initial.weeklySchedule ?? {});

  const questWeekStart = useMemo(() => {
    if (weekStart) return weekStart;
    if (initial.weekStart) return initial.weekStart;
    return toDateString(
      getMondayOfWeek(new Date(initial.referenceNowIso)),
    );
  }, [weekStart, initial.weekStart, initial.referenceNowIso]);

  const refreshRecentWins = useCallback(async () => {
    const supabase = createBrowserClientInstance();
    const wins = await fetchRecentPointWins(supabase);
    setRecentPointWins(wins);
  }, []);

  const refreshWeeklySchedule = useCallback(async () => {
    const supabase = createBrowserClientInstance();
    const { plan } = await fetchCurrentWeekPlanForTidy(supabase);
    if (!plan) return;
    setWeekStart(plan.week_start);
    setWeeklySchedule(
      buildTidyWeeklyScheduleMap(plan.days, plan.week_start),
    );
  }, []);

  const refreshGoalProgress = useCallback(async () => {
    const supabase = createBrowserClientInstance();
    const { data } = await fetchTidyGoalProgress(supabase);
    if (data) setGoalProgress(data);
  }, []);

  const refreshHistory = useCallback(async () => {
    const supabase = createBrowserClientInstance();
    const days = await fetchTidyPointHistoryByDay(supabase);
    setHistoryDays(days);
  }, []);

  const bumpProgressStats = useCallback(() => {
    void refreshGoalProgress();
    void refreshHistory();
  }, [refreshGoalProgress, refreshHistory]);

  useEffect(() => {
    void refreshWeeklySchedule();
    void refreshGoalProgress();
    void refreshHistory();
  }, [refreshWeeklySchedule, refreshGoalProgress, refreshHistory]);

  useEffect(() => {
    const live = todayLocalDateIso();
    setLiveTodayDateIso(live);
    setLogDateYmd((prev) => (prev > live ? live : prev));
  }, []);

  const activeGoal = useMemo(() => resolveActiveGoalReward(rewards), [rewards]);

  const incubatingCount = useMemo(
    () => habits.filter((h) => h.status === "incubating").length,
    [habits],
  );

  const filteredRewards = useMemo(() => {
    if (rewardTierFilter === "all") return rewards;
    return rewards.filter((r) => r.tier === rewardTierFilter);
  }, [rewards, rewardTierFilter]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const pulseBalance = useCallback(() => {
    setBalancePulse(true);
    window.setTimeout(() => setBalancePulse(false), 650);
  }, []);

  const bumpAnytimeClaimCount = useCallback((taskId: string) => {
    setAnytimeClaimCounts((prev) => ({
      ...prev,
      [taskId]: (prev[taskId] ?? 0) + 1,
    }));
  }, []);

  const setAnytimeClaimCount = useCallback((taskId: string, count: number) => {
    setAnytimeClaimCounts((prev) => {
      const next = { ...prev };
      if (count <= 0) {
        delete next[taskId];
      } else {
        next[taskId] = count;
      }
      return next;
    });
  }, []);

  const handleChangePointLogDate = useCallback(
    async (
      logId: string,
      payload: { dateYmd: string; created_at: string },
    ) => {
      setChangingLogDateId(logId);
      const supabase = createBrowserClientInstance();
      const { error } = await updateTidyPointLogCreatedAt(
        supabase,
        logId,
        payload.dateYmd,
      );
      setChangingLogDateId(null);
      if (error) {
        showToast(formatSupabaseError(error) || "Could not change date");
        return;
      }
      setRecentPointWins((prev) =>
        prev.map((w) =>
          w.id === logId ? { ...w, created_at: payload.created_at } : w,
        ),
      );
      showToast(`Moved to ${payload.dateYmd}`);
      void refreshRecentWins();
      bumpProgressStats();
      void revalidateAfterTidyPoints();
    },
    [bumpProgressStats, refreshRecentWins, showToast],
  );

  const handleUndoPointWin = useCallback(
    async (win: TidyPointWin) => {
      setUndoingPointId(win.id);
      const supabase = createBrowserClientInstance();
      const { balance, tidyTask, anytimeClaimCount, error } =
        await undoTidyPointWin(supabase, win.id);
      setUndoingPointId(null);
      if (error) {
        console.error(formatSupabaseError(error));
        showToast("Could not undo — check console");
        return;
      }
      setPointBalance(balance);
      setRecentPointWins((prev) => prev.filter((w) => w.id !== win.id));
      if (tidyTask) {
        setTasks((prev) =>
          prev.map((t) => (t.id === tidyTask.id ? tidyTask : t)),
        );
      }
      if (win.task_id && anytimeClaimCount !== null) {
        setAnytimeClaimCount(win.task_id, anytimeClaimCount);
      }
      pulseBalance();
      showToast("Undid mistaken points");
      void refreshRecentWins();
      void refreshWeeklySchedule();
      void revalidateAfterTidyPoints();
      bumpProgressStats();
    },
    [
      bumpProgressStats,
      pulseBalance,
      refreshRecentWins,
      refreshWeeklySchedule,
      setAnytimeClaimCount,
      showToast,
    ],
  );

  const handleUndoAnytimeClaim = useCallback(
    async (task: TidyTask) => {
      setUndoingClaimTaskId(task.id);
      const supabase = createBrowserClientInstance();
      const { balance, tidyTask, anytimeClaimCount, error } =
        await undoLatestAnytimeClaim(supabase, task);
      setUndoingClaimTaskId(null);
      if (error) {
        console.error(formatSupabaseError(error));
        showToast("Nothing to undo");
        return;
      }
      setPointBalance(balance);
      if (tidyTask) {
        setTasks((prev) =>
          prev.map((t) => (t.id === tidyTask.id ? tidyTask : t)),
        );
      }
      if (anytimeClaimCount !== null) {
        setAnytimeClaimCount(task.id, anytimeClaimCount);
      }
      pulseBalance();
      showToast(`Removed last claim (−${task.points} pts)`);
      void refreshRecentWins();
      void refreshWeeklySchedule();
      void revalidateAfterTidyPoints();
      bumpProgressStats();
    },
    [
      bumpProgressStats,
      pulseBalance,
      refreshRecentWins,
      refreshWeeklySchedule,
      setAnytimeClaimCount,
      showToast,
    ],
  );

  const handleToggleStep = useCallback(
    async (task: TidyTask, stepId: string, complete: boolean) => {
      const step = task.micro_steps.find((s) => s.id === stepId);
      const supabase = createBrowserClientInstance();
      const { data, balance, error } = await toggleTidyMicroStep(
        supabase,
        task,
        stepId,
        complete,
      );
      if (error || !data) {
        console.error(formatSupabaseError(error));
        return;
      }
      setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      setPointBalance(balance);
      if (complete && step) {
        pulseBalance();
        showToast(`Earned +${step.points} pts!`);
      }
      if (
        task.recurrence === "anytime" &&
        complete &&
        allMicroStepsComplete(task.micro_steps) &&
        data.micro_steps.every((s) => !s.is_completed)
      ) {
        bumpAnytimeClaimCount(task.id);
        pulseBalance();
        showToast(`Earned +${task.points} pts!`);
        void stampAnytimeClaimOnWeekly(supabase, data);
        void refreshWeeklySchedule();
        bumpProgressStats();
      } else if (complete && step) {
        bumpProgressStats();
      }
    },
    [
      bumpAnytimeClaimCount,
      bumpProgressStats,
      pulseBalance,
      refreshWeeklySchedule,
      showToast,
    ],
  );

  const handleBackdate = useCallback(
    async (
      task: TidyTask,
      payload: { dateYmd: string; created_at: string },
    ) => {
      if (payload.dateYmd > liveTodayDateIso) {
        showToast("Pick today or an earlier date");
        return;
      }
      setBackdatingTaskId(task.id);
      const supabase = createBrowserClientInstance();
      const { data, balance, error } = await logTidyQuestBackdate(supabase, {
        task,
        dateYmd: payload.dateYmd,
        created_at: payload.created_at,
      });
      setBackdatingTaskId(null);
      if (error || !data) {
        showToast(formatSupabaseError(error) || "Could not log for that date");
        return;
      }
      setPointBalance(balance);
      pulseBalance();
      showToast(`Logged +${data.points} pts for ${payload.dateYmd}`);
      void refreshRecentWins();
      bumpProgressStats();
      void revalidateAfterTidyPoints();
    },
    [
      bumpProgressStats,
      liveTodayDateIso,
      pulseBalance,
      refreshRecentWins,
      showToast,
    ],
  );

  const handleClaim = useCallback(
    async (task: TidyTask) => {
      const supabase = createBrowserClientInstance();
      const backdateClaim = logDateYmd < liveTodayDateIso;
      if (backdateClaim) {
        const { data, balance, error } = await logTidyQuestBackdate(supabase, {
          task,
          dateYmd: logDateYmd,
          created_at: createdAtLocalNoonIso(logDateYmd),
        });
        if (error || !data) {
          showToast(formatSupabaseError(error) || "Could not log for that date");
          return;
        }
        setPointBalance(balance);
        pulseBalance();
        showToast(`Logged +${data.points} pts for ${logDateYmd}`);
        void refreshRecentWins();
        bumpProgressStats();
        void revalidateAfterTidyPoints();
        return;
      }

      const { data, balance, error } = await claimTidyAnytimeTask(
        supabase,
        task,
      );
      if (error || !data) {
        console.error(formatSupabaseError(error));
        return;
      }
      setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      setPointBalance(balance);
      bumpAnytimeClaimCount(task.id);
      pulseBalance();
      showToast(`Earned +${task.points} pts!`);
      void stampAnytimeClaimOnWeekly(supabase, data);
      void refreshWeeklySchedule();
      void refreshRecentWins();
      bumpProgressStats();
    },
    [
      bumpAnytimeClaimCount,
      bumpProgressStats,
      liveTodayDateIso,
      logDateYmd,
      pulseBalance,
      refreshRecentWins,
      refreshWeeklySchedule,
      showToast,
    ],
  );

  const handleToggle = useCallback(
    async (task: TidyTask) => {
      const done = isTaskEffectivelyComplete(task.recurrence, task.completed_at);
      const supabase = createBrowserClientInstance();
      const { data, balance, error } = await toggleTidyTaskComplete(
        supabase,
        task,
        !done,
      );
      if (error || !data) {
        console.error(formatSupabaseError(error));
        return;
      }
      setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      setPointBalance(balance);
      const complete = isTaskEffectivelyComplete(
        data.recurrence,
        data.completed_at,
      );
      await syncTidyCompletionToWeekly(supabase, data, complete);
      void refreshWeeklySchedule();
      void refreshRecentWins();
      bumpProgressStats();
      if (complete) {
        pulseBalance();
        showToast(`+${data.points} pts`);
      }
    },
    [
      bumpProgressStats,
      pulseBalance,
      refreshRecentWins,
      refreshWeeklySchedule,
      showToast,
    ],
  );

  const handleRedeem = useCallback(
    async (reward: TidyReward) => {
      const supabase = createBrowserClientInstance();
      const { data, balance, error } = await redeemTidyReward(supabase, reward);
      if (error) {
        console.error(formatSupabaseError(error));
        return;
      }
      if (data) {
        setRewards((prev) => prev.map((r) => (r.id === data.id ? data : r)));
        setPointBalance(balance);
        showToast(`🎉 Redeemed “${data.title}”!`);
      }
    },
    [showToast],
  );

  const handleRedeemGoal = useCallback(async () => {
    if (!activeGoal) return;
    setRedeemingGoal(true);
    try {
      await handleRedeem(activeGoal);
    } finally {
      setRedeemingGoal(false);
    }
  }, [activeGoal, handleRedeem]);

  const handleRemoveReward = useCallback(
    async (reward: TidyReward) => {
      setRemovingRewardId(reward.id);
      const supabase = createBrowserClientInstance();
      const { error } = await deleteTidyReward(supabase, reward.id);
      setRemovingRewardId(null);
      if (error) {
        console.error(formatSupabaseError(error));
        showToast("Could not remove reward");
        return;
      }
      setRewards((prev) => prev.filter((r) => r.id !== reward.id));
      showToast(
        reward.vault_item_id ||
          reward.knitting_pattern_id ||
          reward.sewing_pattern_id
          ? "Removed from Shop — source item untouched"
          : "Reward removed",
      );
    },
    [showToast],
  );

  const pinGoal = useCallback(async (rewardId: string) => {
    const supabase = createBrowserClientInstance();
    const { data, error } = await setTidyRewardGoal(supabase, rewardId);
    if (error) {
      console.error(formatSupabaseError(error));
      return;
    }
    setRewards((prev) =>
      prev.map((r) => ({
        ...r,
        is_goal: r.id === rewardId,
      })),
    );
    if (data) {
      setRewards((prev) => prev.map((r) => (r.id === data.id ? data : r)));
    }
  }, []);

  const supabase = createBrowserClientInstance();

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Tidy Guild
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Complete quests, earn points, unlock rewards.
          </p>
        </div>
        <div
          className={`rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold tabular-nums text-zinc-900 shadow-sm transition-transform ${
            balancePulse ? "scale-110 ring-2 ring-emerald-400/60" : ""
          }`}
        >
          {pointBalance} pts
        </div>
      </header>

      <TidyGoalProgressBars
        progress={goalProgress}
        onProgressChange={setGoalProgress}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setGuildView("quests")}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            guildView === "quests"
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 bg-white text-zinc-900"
          }`}
        >
          Quests &amp; Rewards
        </button>
        <button
          type="button"
          onClick={() => setGuildView("habits")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
            guildView === "habits"
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 bg-white text-zinc-900"
          }`}
        >
          Habit Incubator
          <span
            className={`rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums ${
              guildView === "habits"
                ? "bg-white/20 text-white"
                : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {incubatingCount} / {HABIT_INCUBATOR_MAX}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setGuildView("history")}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            guildView === "history"
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 bg-white text-zinc-900"
          }`}
        >
          History &amp; Progress
        </button>
      </div>

      {guildView === "habits" ? (
        <HabitIncubator
          habits={habits}
          todayDateIso={liveTodayDateIso}
          onHabitsChange={setHabits}
          onNewHabit={() => setHabitModal("new")}
          onEditHabit={(h) => setHabitModal(h)}
          onPointsChange={(balance) => {
            setPointBalance(balance);
            pulseBalance();
          }}
          onToast={showToast}
          onGraduated={(habit, graduationPoints) => {
            pulseBalance();
            showToast(
              `🎓 ESTABLISHED: “${habit.title}” · +${graduationPoints} pts bonus!`,
            );
            void refreshRecentWins();
            bumpProgressStats();
            void revalidateAfterTidyPoints();
          }}
          onProgressBump={() => {
            void refreshRecentWins();
            bumpProgressStats();
            void revalidateAfterTidyPoints();
          }}
        />
      ) : null}

      {guildView === "history" ? (
        <TidyGuildHistory
          progress={goalProgress}
          days={historyDays}
          todayDateIso={liveTodayDateIso}
          changingDateId={changingLogDateId}
          onChangeDate={(logId, payload) =>
            void handleChangePointLogDate(logId, payload)
          }
        />
      ) : null}

      {guildView === "quests" ? (
        <RecentPointWins
          wins={recentPointWins}
          todayDateIso={liveTodayDateIso}
          onUndo={(win) => void handleUndoPointWin(win)}
          undoingId={undoingPointId}
          changingDateId={changingLogDateId}
          onChangeDate={(win, payload) =>
            void handleChangePointLogDate(win.id, payload)
          }
        />
      ) : null}

      {guildView === "quests" && activeGoal ? (
        <div className="mb-6">
          <ActiveGoalBanner
            reward={activeGoal}
            pointBalance={pointBalance}
            onRedeem={handleRedeemGoal}
            redeeming={redeemingGoal}
          />
        </div>
      ) : null}

      {guildView === "quests" ? (
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">Quests</h2>
            <button
              type="button"
              onClick={() => setTaskModal("new")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              <Plus className="size-4" />
              Add task
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setQuickWinsOnly((q) => !q)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                quickWinsOnly
                  ? "border-amber-500 bg-amber-50 text-amber-900"
                  : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              ⚡ Quick Wins (≤ 5 pts)
            </button>
          </div>

          <LogWinBar
            todayDateIso={liveTodayDateIso}
            logDateYmd={logDateYmd}
            onLogDateChange={setLogDateYmd}
            onEarned={({ points, balance, task, taskId, dateYmd }) => {
              setPointBalance(balance);
              pulseBalance();
              const isToday = dateYmd === liveTodayDateIso;
              showToast(
                isToday
                  ? `Earned +${points} pts!`
                  : `Logged +${points} pts for ${dateYmd}`,
              );
              bumpProgressStats();
              if (task) {
                setTasks((prev) => {
                  const exists = prev.some((t) => t.id === task.id);
                  return exists
                    ? prev.map((t) => (t.id === task.id ? task : t))
                    : [task, ...prev];
                });
                bumpAnytimeClaimCount(task.id);
              } else if (taskId) {
                bumpAnytimeClaimCount(taskId);
              }
              void refreshRecentWins();
              bumpProgressStats();
              void revalidateAfterTidyPoints();
            }}
          />

          <TidyQuestSections
            tasks={tasks}
            quickWinsOnly={quickWinsOnly}
            weekStart={questWeekStart}
            todayDateIso={liveTodayDateIso}
            weeklySchedule={weeklySchedule}
            referenceNowIso={initial.referenceNowIso}
            anytimeClaimCounts={anytimeClaimCounts}
            undoingClaimTaskId={undoingClaimTaskId}
            onClaim={handleClaim}
            onUndoClaim={handleUndoAnytimeClaim}
            onToggle={handleToggle}
            onToggleStep={handleToggleStep}
            onEdit={(task) => setTaskModal(task)}
            onDelete={async (task) => {
              const { error } = await deleteTidyTask(supabase, task.id);
              if (!error) {
                setTasks((prev) => prev.filter((t) => t.id !== task.id));
              }
            }}
            onWeeklyResult={(taskId, result) => {
              showToast(result.message);
              if (result.success && result.day) {
                setWeeklySchedule((prev) => ({
                  ...prev,
                  [taskId]: result.day!,
                }));
                void refreshWeeklySchedule();
              }
            }}
            backdatingTaskId={backdatingTaskId}
            onBackdate={handleBackdate}
          />
        </section>

        <aside className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">Reward shop</h2>
            <button
              type="button"
              onClick={() => setRewardModal("new")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Plus className="size-4" />
              Add reward
            </button>
          </div>

          <MysteryBox
            rewards={rewards}
            pointBalance={pointBalance}
            onBalanceChange={setPointBalance}
            onRewardUpdated={(reward) =>
              setRewards((prev) =>
                prev.map((r) => (r.id === reward.id ? reward : r)),
              )
            }
            onReveal={(title) => showToast(`🎁 Mystery treat: “${title}”!`)}
          />

          <div className="mb-4 flex flex-wrap gap-2">
            {TIDY_REWARD_TIER_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setRewardTierFilter(f.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  rewardTierFilter === f.id
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <ul className="flex flex-col gap-3">
            {filteredRewards.map((reward) => (
              <TidyRewardShopCard
                key={reward.id}
                reward={reward}
                supabase={supabase}
                pointBalance={pointBalance}
                onPinGoal={() => void pinGoal(reward.id)}
                onRedeem={() => void handleRedeem(reward)}
                onEdit={() => setRewardModal(reward)}
                onRemove={() => void handleRemoveReward(reward)}
                removing={removingRewardId === reward.id}
              />
            ))}
            {filteredRewards.length === 0 ? (
              <li className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-600">
                Add a reward to shop toward.
              </li>
            ) : null}
          </ul>
        </aside>
      </div>
      ) : null}

      {toast ? (
        <TidyToast message={toast} />
      ) : null}

      <TaskModal
        open={taskModal !== null}
        task={taskModal === "new" ? null : taskModal}
        onClose={() => setTaskModal(null)}
        onSaved={(task) => {
          setTasks((prev) => {
            const exists = prev.some((t) => t.id === task.id);
            return exists
              ? prev.map((t) => (t.id === task.id ? task : t))
              : [task, ...prev];
          });
        }}
      />

      <HabitModal
        open={habitModal !== null}
        habit={habitModal === "new" ? null : habitModal}
        incubatingCount={incubatingCount}
        onClose={() => setHabitModal(null)}
        onSaved={(habit) => {
          setHabits((prev) => {
            const exists = prev.some((h) => h.id === habit.id);
            return exists
              ? prev.map((h) => (h.id === habit.id ? habit : h))
              : [...prev, habit];
          });
        }}
      />

      <RewardModal
        open={rewardModal !== null}
        reward={rewardModal === "new" ? null : rewardModal}
        onClose={() => setRewardModal(null)}
        onSaved={(reward) => {
          setRewards((prev) => {
            const exists = prev.some((r) => r.id === reward.id);
            const next = exists
              ? prev.map((r) => (r.id === reward.id ? reward : r))
              : [...prev, reward];
            if (reward.is_goal) {
              return next.map((r) => ({
                ...r,
                is_goal: r.id === reward.id,
              }));
            }
            return next;
          });
        }}
      />
    </>
  );
}

function TidyToast({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[70] max-w-sm -translate-x-1/2 rounded-xl border border-zinc-200 bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
    >
      {message}
    </div>
  );
}