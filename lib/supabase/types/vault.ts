import type { VaultCurrency, VaultItemStatus, VaultUrgeTag } from "@/lib/vault/constants";
import type { VaultTempValue } from "@/lib/vault/temperature";

export type VaultTempHistoryEntry = {
  temp: VaultTempValue;
  checked_at: string;
};

export type VaultItem = {
  id: string;
  user_id: string;
  title: string;
  price_amount: number;
  currency: VaultCurrency;
  pause_hours: number;
  reward_points: number;
  unlock_at: string;
  urge_tag: VaultUrgeTag | null;
  url: string | null;
  image_url: string | null;
  notes: string | null;
  initial_temp: VaultTempValue;
  current_temp: VaultTempValue;
  temp_history: VaultTempHistoryEntry[];
  status: VaultItemStatus;
  linked_reward_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VaultSnapshot = {
  items: VaultItem[];
  pausedCount: number;
  pendingRewardPoints: number;
  keptSafeKrw: number;
  keptSafeUsd: number;
};