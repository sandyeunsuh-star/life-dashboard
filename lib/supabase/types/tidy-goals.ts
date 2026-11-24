export type TidyGoalsRow = {
  user_id: string;
  daily_goal: number;
  monthly_goal: number;
  updated_at: string;
};

export type TidyGoalProgress = {
  daily_goal: number;
  monthly_goal: number;
  today_points: number;
  today_wins: number;
  week_points: number;
  week_wins: number;
  month_points: number;
  month_wins: number;
};