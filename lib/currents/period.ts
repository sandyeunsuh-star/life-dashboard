/** Calendar month key `YYYY-MM`. */
export function currentPeriodYm(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function periodLabelFromYm(periodYm: string): string {
  const [y, m] = periodYm.split("-").map(Number);
  if (!y || !m) return periodYm;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function periodYmFromLabel(label: string): string | null {
  const parsed = Date.parse(`${label.trim()} 1`);
  if (Number.isNaN(parsed)) return null;
  return currentPeriodYm(new Date(parsed));
}