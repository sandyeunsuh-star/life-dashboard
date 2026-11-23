export const STANDARD_NEEDLE_SIZES = [
  "US 000 (1.5 mm)",
  "US 00 (1.75 mm)",
  "US 0 (2.0 mm)",
  "US 1 (2.25 mm)",
  "US 1.5 (2.5 mm)",
  "US 2 (2.75 mm)",
  "US 2.5 (3.0 mm)",
  "US 3 (3.25 mm)",
  "US 4 (3.5 mm)",
  "US 5 (3.75 mm)",
  "US 6 (4.0 mm)",
  "US 7 (4.5 mm)",
  "US 8 (5.0 mm)",
  "US 9 (5.5 mm)",
  "US 10 (6.0 mm)",
  "US 10.5 (6.5 mm)",
  "US 11 (8.0 mm)",
  "US 13 (9.0 mm)",
  "US 15 (10.0 mm)",
  "US 17 (12.0 mm)",
  "US 19 (15.0 mm)",
  "US 35 (19.0 mm)",
  "US 50 (25.0 mm)",
] as const;

const STANDARD_SET = new Set<string>(STANDARD_NEEDLE_SIZES);

export type StandardNeedleSize = (typeof STANDARD_NEEDLE_SIZES)[number];

export function parseNeedleSizeField(raw: string | null | undefined): {
  selected: string[];
  legacy: string;
} {
  if (!raw?.trim()) {
    return { selected: [], legacy: "" };
  }

  const selected: string[] = [];
  const legacyParts: string[] = [];

  for (const part of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (STANDARD_SET.has(part)) {
      if (!selected.includes(part)) {
        selected.push(part);
      }
    } else {
      legacyParts.push(part);
    }
  }

  return { selected, legacy: legacyParts.join(", ") };
}

export function serializeNeedleSize(
  selected: string[],
  legacy: string,
): string {
  const parts = [...selected];
  const leg = legacy.trim();
  if (leg) parts.push(leg);
  return parts.join(", ");
}

export function isStandardNeedleSize(value: string): boolean {
  return STANDARD_SET.has(value);
}