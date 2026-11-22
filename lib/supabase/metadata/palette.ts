import { dedupeTrimmedStrings } from "../dedupe-strings";

const HEX6_PATTERN = /^[0-9A-F]{6}$/;

export function normalizeHexColor(input: string): string | null {
  let hex = input.trim().replace(/^#/, "").toUpperCase();
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
  }
  if (!HEX6_PATTERN.test(hex)) {
    return null;
  }
  return `#${hex}`;
}

export function parseHexColorsFromText(text: string): string[] {
  const parts = text.split(/[\s,;]+/).filter(Boolean);
  const colors: string[] = [];
  for (const part of parts) {
    const normalized = normalizeHexColor(part);
    if (normalized) {
      colors.push(normalized);
    }
  }
  return dedupePalette(colors);
}

export function dedupePalette(colors: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const color of colors) {
    const normalized = normalizeHexColor(color);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

export function hexDisplayCode(hex: string): string {
  return hex.replace(/^#/, "").toUpperCase();
}

function srgbChannel(value: number): number {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return 0;
  const code = hexDisplayCode(normalized);
  const r = parseInt(code.slice(0, 2), 16);
  const g = parseInt(code.slice(2, 4), 16);
  const b = parseInt(code.slice(4, 6), 16);
  return (
    0.2126 * srgbChannel(r) +
    0.7152 * srgbChannel(g) +
    0.0722 * srgbChannel(b)
  );
}

export function contrastTextOnHex(hex: string): "#FFFFFF" | "#18181B" {
  return relativeLuminance(hex) > 0.62 ? "#18181B" : "#FFFFFF";
}

export function parsePaletteFromMetadata(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }
  const parsed = raw
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => normalizeHexColor(entry))
    .filter((entry): entry is string => Boolean(entry));
  const deduped = dedupePalette(parsed);
  return deduped.length > 0 ? deduped : undefined;
}