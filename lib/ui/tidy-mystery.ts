"use client";

import {
  TIDY_MYSTERY_SPIN_DEFAULT,
  TIDY_MYSTERY_SPIN_STORAGE_KEY,
} from "@/lib/tidy/constants";

export function readMysterySpinCost(): number {
  if (typeof window === "undefined") {
    return TIDY_MYSTERY_SPIN_DEFAULT;
  }
  const raw = window.localStorage.getItem(TIDY_MYSTERY_SPIN_STORAGE_KEY);
  if (!raw) {
    return TIDY_MYSTERY_SPIN_DEFAULT;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : TIDY_MYSTERY_SPIN_DEFAULT;
}

export function writeMysterySpinCost(cost: number): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    TIDY_MYSTERY_SPIN_STORAGE_KEY,
    String(Math.max(1, cost)),
  );
}