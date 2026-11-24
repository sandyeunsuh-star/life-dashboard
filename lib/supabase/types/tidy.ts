import type { TidyRecurrence, TidyRewardTier } from "@/lib/tidy/constants";
import type { DayKey } from "@/lib/weekly/constants";
import type { TidyHabitRow } from "@/lib/supabase/types/tidy-habit";

export type TidyMicroStep = {
  id: string;
  title: string;
  points: number;
  is_completed: boolean;
};

export type TidyPointLogKind =
  | "task_complete"
  | "task_undo"
  | "redeem"
  | "micro_step"
  | "micro_step_undo"
  | "mystery_spin"
  | "anytime_claim"
  | "ad_hoc_win"
  | "vault_skip"
  | "weekly_task"
  | "weekly_task_undo"
  | "habit_checkin"
  | "habit_checkin_undo"
  | "habit_graduation"
  | "gratitude";

export type TidyTask = {
  id: string;
  user_id: string;
  title: string;
  icon_key: string;
  points: number;
  recurrence: TidyRecurrence;
  completed_at: string | null;
  micro_steps: TidyMicroStep[];
  bundle_tag: string | null;
  created_at: string;
  updated_at: string;
};

export type TidyReward = {
  id: string;
  user_id: string;
  title: string;
  points_cost: number;
  image_path: string | null;
  image_url: string | null;
  link_url: string | null;
  source_url: string | null;
  vault_item_id: string | null;
  knitting_pattern_id: string | null;
  sewing_pattern_id: string | null;
  is_goal: boolean;
  is_repeatable: boolean;
  redeemed_count: number;
  tier: TidyRewardTier;
  is_mystery: boolean;
  created_at: string;
  updated_at: string;
};

export type TidyPointLog = {
  id: string;
  user_id: string;
  points: number;
  delta: number | null;
  kind: TidyPointLogKind;
  task_id: string | null;
  reward_id: string | null;
  step_id: string | null;
  vault_item_id: string | null;
  weekly_task_id: string | null;
  reason: string | null;
  created_at: string;
};

export type TidyPointWin = Pick<
  TidyPointLog,
  | "id"
  | "points"
  | "kind"
  | "reason"
  | "task_id"
  | "vault_item_id"
  | "weekly_task_id"
  | "created_at"
>;

export type TidyGuildSnapshot = {
  tasks: TidyTask[];
  rewards: TidyReward[];
  pointBalance: number;
  /** Count of `anytime_claim` logs per task id. */
  anytimeClaimCounts: Record<string, number>;
  recentPointWins: TidyPointWin[];
  habits: TidyHabitRow[];
  /** Fixed clock for SSR + hydration (ISO). */
  referenceNowIso: string;
  /** Local calendar date (YYYY-MM-DD) paired with `referenceNowIso`. */
  todayDateIso: string;
  weekStart: string;
  weeklySchedule: Record<string, DayKey>;
};