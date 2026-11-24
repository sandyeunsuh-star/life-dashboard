import type { HabitStatus, HabitTier } from "@/lib/tidy/habit-constants";

export type TidyHabitRow = {
  id: string;
  user_id: string;
  title: string;
  anchor_cue: string | null;
  tier: HabitTier;
  target_days: number;
  daily_points: number;
  graduation_points: number;
  status: HabitStatus;
  check_in_dates: string[];
  established_at: string | null;
  created_at: string;
  updated_at: string;
};