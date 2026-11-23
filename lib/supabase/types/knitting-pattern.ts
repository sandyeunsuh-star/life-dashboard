import type { KnittingCategory, KnittingStatus, YarnWeight } from "@/lib/knitting/constants";

export type KnittingPatternRow = {
  id: string;
  user_id: string;
  title: string;
  designer: string | null;
  category: KnittingCategory | string | null;
  status: KnittingStatus;
  yarn_weight: YarnWeight | string | null;
  needle_size: string | null;
  gauge: string | null;
  yardage: string | null;
  cover_path: string | null;
  pdf_path: string | null;
  pdf_filename: string | null;
  notes: string | null;
  is_wishlist: boolean;
  purchase_url: string | null;
  created_at: string;
  updated_at: string;
};

export type KnittingPatternInput = {
  title: string;
  designer?: string | null;
  category?: string | null;
  status: KnittingStatus;
  yarn_weight?: string | null;
  needle_size?: string | null;
  gauge?: string | null;
  yardage?: string | null;
  cover_path?: string | null;
  pdf_path?: string | null;
  pdf_filename?: string | null;
  notes?: string | null;
  is_wishlist?: boolean;
  purchase_url?: string | null;
};