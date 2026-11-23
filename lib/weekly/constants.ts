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
};

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