import { FABRIC_TYPES } from "./constants";

const FABRIC_SET = new Set<string>(FABRIC_TYPES);

export function parseFabricTypeField(raw: string | null | undefined): {
  selected: string[];
  legacy: string;
} {
  if (!raw?.trim()) return { selected: [], legacy: "" };

  const selected: string[] = [];
  const legacyParts: string[] = [];

  for (const part of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (FABRIC_SET.has(part)) {
      if (!selected.includes(part)) selected.push(part);
    } else {
      legacyParts.push(part);
    }
  }

  return { selected, legacy: legacyParts.join(", ") };
}

export function serializeFabricTypes(
  selected: string[],
  legacy: string,
): string {
  const parts = [...selected];
  const leg = legacy.trim();
  if (leg) parts.push(leg);
  return parts.join(", ");
}