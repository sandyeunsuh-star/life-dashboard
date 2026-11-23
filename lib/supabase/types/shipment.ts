import type { ShipmentStatus } from "@/lib/weekly/constants";

export type ShipmentRow = {
  id: string;
  user_id: string;
  label: string;
  status: ShipmentStatus;
  tracking_url: string | null;
  is_delivered: boolean;
  created_at: string;
  updated_at: string;
};