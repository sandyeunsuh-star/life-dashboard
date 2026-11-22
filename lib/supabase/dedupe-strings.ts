/** Trim, drop empties, and dedupe (case-insensitive by default; first casing wins). */
export function dedupeTrimmedStrings(
  values: string[],
  options?: { caseSensitive?: boolean },
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const key = options?.caseSensitive ? trimmed : trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}