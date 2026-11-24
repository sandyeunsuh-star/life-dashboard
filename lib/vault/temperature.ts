import type { VaultTempHistoryEntry } from "@/lib/supabase/types/vault";

export const VAULT_TEMP_SCALE = [
  { value: 1, emoji: "❄️", label: "Meh" },
  { value: 2, emoji: "🌤️", label: "Mild" },
  { value: 3, emoji: "☀️", label: "Warm" },
  { value: 4, emoji: "🔥", label: "Hot" },
  { value: 5, emoji: "🌋", label: "Must-Have" },
] as const;

export type VaultTempValue = (typeof VAULT_TEMP_SCALE)[number]["value"];

export const VAULT_TEMP_DEFAULT: VaultTempValue = 4;

export function clampVaultTemp(value: number): VaultTempValue {
  const n = Math.round(value);
  if (n <= 1) return 1;
  if (n >= 5) return 5;
  return n as VaultTempValue;
}

export function vaultTempMeta(value: number) {
  const clamped = clampVaultTemp(value);
  return (
    VAULT_TEMP_SCALE.find((s) => s.value === clamped) ?? VAULT_TEMP_SCALE[3]
  );
}

/** Short chip e.g. `🔥 4` */
export function vaultTempShort(value: number): string {
  const m = vaultTempMeta(value);
  return `${m.emoji} ${m.value}`;
}

/** Full label e.g. `🔥 Hot` */
export function vaultTempLabel(value: number): string {
  const m = vaultTempMeta(value);
  return `${m.emoji} ${m.label}`;
}

export type VaultTempTrend = "cooled" | "heated" | "steady";

export function vaultTempTrend(
  initial: number,
  current: number,
): VaultTempTrend {
  if (current < initial) return "cooled";
  if (current > initial) return "heated";
  return "steady";
}

export function vaultTempTrendText(
  initial: number,
  current: number,
): string {
  const trend = vaultTempTrend(initial, current);
  if (trend === "steady") {
    return `${vaultTempShort(current)} · Steady`;
  }
  return `${vaultTempShort(initial)} → ${vaultTempShort(current)} · ${
    trend === "cooled" ? "Cooled ↓" : "Heated ↑"
  }`;
}

export function parseTempHistory(raw: unknown): VaultTempHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const temp =
        typeof record.temp === "number"
          ? clampVaultTemp(record.temp)
          : clampVaultTemp(Number(record.temp));
      const checked_at =
        typeof record.checked_at === "string" ? record.checked_at : "";
      if (!checked_at) return null;
      return { temp, checked_at };
    })
    .filter((e): e is VaultTempHistoryEntry => e !== null);
}

export function appendTempHistory(
  history: VaultTempHistoryEntry[],
  temp: VaultTempValue,
  checkedAt = new Date().toISOString(),
): VaultTempHistoryEntry[] {
  return [...history, { temp, checked_at: checkedAt }];
}

export function firstTempHistoryEntry(
  temp: VaultTempValue,
  checkedAt = new Date().toISOString(),
): VaultTempHistoryEntry[] {
  return [{ temp, checked_at: checkedAt }];
}