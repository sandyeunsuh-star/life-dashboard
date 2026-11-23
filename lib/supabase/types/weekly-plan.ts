import type { WeeklyDays } from "@/lib/weekly/constants";

export type WeeklyPlanRow = {
  id: string;
  user_id: string;
  week_start: string;
  days: WeeklyDays;
  created_at: string;
  updated_at: string;
};