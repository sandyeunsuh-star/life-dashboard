import type { VaultCurrency } from "@/lib/vault/constants";

export type VaultPauseRecommendation = {
  hours: number;
  rewardPoints: number;
};

export function recommendVaultPause(
  priceAmount: number,
  currency: VaultCurrency,
): VaultPauseRecommendation {
  if (currency === "USD") {
    if (priceAmount < 30) {
      return { hours: 24, rewardPoints: 15 };
    }
    if (priceAmount <= 100) {
      return { hours: 48, rewardPoints: 25 };
    }
    return { hours: 168, rewardPoints: 40 };
  }

  if (priceAmount < 40_000) {
    return { hours: 24, rewardPoints: 15 };
  }
  if (priceAmount <= 140_000) {
    return { hours: 48, rewardPoints: 25 };
  }
  return { hours: 168, rewardPoints: 40 };
}

export function unlockAtFromHours(
  pauseHours: number,
  from = new Date(),
): Date {
  return new Date(from.getTime() + pauseHours * 60 * 60 * 1000);
}

export function durationPillIdForHours(hours: number): string | null {
  const match = [24, 48, 72, 168].find((h) => h === hours);
  if (match === 24) return "24h";
  if (match === 48) return "48h";
  if (match === 72) return "72h";
  if (match === 168) return "7d";
  return null;
}