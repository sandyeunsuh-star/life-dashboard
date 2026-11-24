import { toDateString } from "@/lib/weekly/dates";

/** Local calendar YYYY-MM-DD for a `Date` or ISO timestamp. */
export function localDateKeyFromIso(isoOrDate: string | Date): string {
  const d =
    typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return toDateString(d);
}

export function todayLocalDateIso(now = new Date()): string {
  return toDateString(now);
}

export function yesterdayLocalDateIso(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return toDateString(d);
}

/** Store ledger rows at local noon so they bucket to the intended calendar day. */
export function createdAtLocalNoonIso(dateYmd: string): string {
  return new Date(`${dateYmd}T12:00:00`).toISOString();
}