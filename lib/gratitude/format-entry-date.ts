export function formatGratitudeEntryDate(entryDate: string): string {
  const date = new Date(`${entryDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return entryDate;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}