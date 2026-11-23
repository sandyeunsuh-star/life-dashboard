import type {
  FabricType,
  SewingCategory,
  SewingStatus,
} from "@/lib/sewing/constants";

export type SewingPatternRow = {
  id: string;
  user_id: string;
  title: string;
  designer: string | null;
  category: SewingCategory | string | null;
  status: SewingStatus;
  fabric_type: FabricType | string | null;
  fabric_recs: string | null;
  yardage: string | null;
  notions: string | null;
  size_info: string | null;
  purchase_url: string | null;
  is_wishlist: boolean;
  cover_path: string | null;
  instructions_pdf_path: string | null;
  instructions_drive_url: string | null;
  pattern_pdf_path: string | null;
  pattern_pdf_filename: string | null;
  pattern_drive_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SewingPatternInput = {
  title: string;
  designer?: string | null;
  category?: string | null;
  status: SewingStatus;
  fabric_type?: string | null;
  fabric_recs?: string | null;
  yardage?: string | null;
  notions?: string | null;
  size_info?: string | null;
  purchase_url?: string | null;
  is_wishlist?: boolean;
  cover_path?: string | null;
  instructions_pdf_path?: string | null;
  instructions_drive_url?: string | null;
  pattern_pdf_path?: string | null;
  pattern_pdf_filename?: string | null;
  pattern_drive_url?: string | null;
  notes?: string | null;
};