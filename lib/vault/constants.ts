export type VaultCurrency = "KRW" | "USD";

export type VaultItemStatus = "paused" | "skipped" | "bought" | "rewarded";

export type VaultUrgeTag =
  | "Stressed"
  | "Tired"
  | "Bored"
  | "Treat Myself"
  | "Actually Need";

export const VAULT_URGE_CHIPS: VaultUrgeTag[] = [
  "Stressed",
  "Tired",
  "Bored",
  "Treat Myself",
  "Actually Need",
];

export const VAULT_DURATION_PILLS = [
  { id: "24h", label: "24h", hours: 24 },
  { id: "48h", label: "48h", hours: 48 },
  { id: "72h", label: "72h", hours: 72 },
  { id: "7d", label: "7 Days", hours: 168 },
] as const;

export type VaultDurationPillId = (typeof VAULT_DURATION_PILLS)[number]["id"];