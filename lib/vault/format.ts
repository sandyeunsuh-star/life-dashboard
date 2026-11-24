import type { VaultCurrency } from "@/lib/vault/constants";

export function formatVaultPrice(
  amount: number,
  currency: VaultCurrency,
): string {
  if (currency === "KRW") {
    const whole = Math.round(amount);
    return `₩${whole.toLocaleString("en-US")}`;
  }
  return `$${amount.toFixed(2)}`;
}

export function formatVaultCountdown(unlockAt: string, now = new Date()): string {
  const unlock = new Date(unlockAt);
  if (Number.isNaN(unlock.getTime())) {
    return "Cooling off";
  }
  if (now >= unlock) {
    return "Ready to decide";
  }

  const ms = unlock.getTime() - now.getTime();
  const totalHours = Math.ceil(ms / (60 * 60 * 1000));
  if (totalHours >= 48) {
    const days = Math.ceil(totalHours / 24);
    return `Cooling off · ${days}d left`;
  }
  if (totalHours >= 2) {
    return `Cooling off · ${totalHours}h left`;
  }
  const minutes = Math.max(1, Math.ceil(ms / (60 * 1000)));
  return `Cooling off · ${minutes}m left`;
}

/** Compact countdown for widgets (`14h left`). */
export function formatVaultCountdownShort(
  unlockAt: string,
  now = new Date(),
): string {
  const unlock = new Date(unlockAt);
  if (Number.isNaN(unlock.getTime())) {
    return "Cooling";
  }
  if (now >= unlock) {
    return "Ready to decide";
  }
  const ms = unlock.getTime() - now.getTime();
  const totalHours = Math.ceil(ms / (60 * 60 * 1000));
  if (totalHours >= 48) {
    const days = Math.ceil(totalHours / 24);
    return `${days}d left`;
  }
  if (totalHours >= 1) {
    return `${totalHours}h left`;
  }
  const minutes = Math.max(1, Math.ceil(ms / (60 * 1000)));
  return `${minutes}m left`;
}