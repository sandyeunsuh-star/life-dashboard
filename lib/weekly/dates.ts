import type { DayKey } from "./constants";
import { DAY_KEYS } from "./constants";

/** Local-calendar Monday 00:00 for the week containing `date`. */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateString(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

export function addWeeks(monday: Date, weeks: number): Date {
  return addDays(monday, weeks * 7);
}

export function formatMonthDay(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatShort(d: Date): string {
  return formatMonthDay(d);
}

/** Calendar date for a day in the plan week (Mon = 0 … Sun = 6). */
export function formatWeekDayDate(weekStartIso: string, day: DayKey): string {
  const monday = parseDateString(weekStartIso);
  const offset = DAY_KEYS.indexOf(day);
  return formatMonthDay(addDays(monday, offset));
}

export function formatWeekRange(weekStartIso: string): string {
  const monday = parseDateString(weekStartIso);
  const sunday = addDays(monday, 6);
  return `Week of ${formatShort(monday)} – ${formatShort(sunday)}`;
}

export function todayDayKey(weekStartIso: string): DayKey | null {
  const today = new Date();
  const todayMid = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const monday = parseDateString(weekStartIso);
  const diff = Math.round(
    (todayMid.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0 || diff > 6) return null;
  return DAY_KEYS[diff];
}

export function nextDayKey(day: DayKey): DayKey | null {
  const i = DAY_KEYS.indexOf(day);
  if (i < 0 || i >= DAY_KEYS.length - 1) return null;
  return DAY_KEYS[i + 1];
}