export const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  monday: "MONDAY",
  tuesday: "TUESDAY",
  wednesday: "WEDNESDAY",
  thursday: "THURSDAY",
  friday: "FRIDAY",
  saturday: "SATURDAY",
  sunday: "SUNDAY",
};

export type WeeklyTask = {
  id: string;
  text: string;
  checked: boolean;
  /** Tidy Guild points when checked (weekly-only tasks). Default 0 = hidden. */
  points?: number;
  /** Linked tidy_tasks.id — completion sync, no double points from weekly. */
  tidy_task_id?: string | null;
  /** Same-day anytime claims pinned on Today's column. */
  anytime_claim_count?: number;
};

export const WEEKLY_TIDY_POINT_PRESETS = [0, 10, 20, 30] as const;

export type WeeklyDays = Record<DayKey, WeeklyTask[]>;

export const EMPTY_WEEKLY_DAYS: WeeklyDays = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

export type RecurringTemplate = Record<DayKey, string[]>;

export const DEFAULT_RECURRING_TEMPLATE: RecurringTemplate = {
  monday: ["Gym: ", "Running: "],
  tuesday: ["Gym: ", "Running: "],
  wednesday: ["Gym: ", "Running: "],
  thursday: ["Gym: ", "Running: "],
  friday: ["Gym: ", "Running: "],
  saturday: [],
  sunday: [],
};

export type QuickCopySettings = {
  korean_address: string;
  english_address: string;
  customs_id: string;
};

export const DEFAULT_QUICK_COPY: QuickCopySettings = {
  korean_address: "",
  english_address: "",
  customs_id: "",
};

export const SHIPMENT_STATUSES = [
  "Ordered",
  "Shipped",
  "Customs",
  "Delivered",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];