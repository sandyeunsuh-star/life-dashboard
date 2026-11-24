import type { CurrentsPromptKey, CurrentsPromptsMap } from "@/lib/currents/constants";
import type { CurrentsPaperOverlay } from "@/lib/currents/paper-overlay";

export type CurrentsEntryRow = {
  id: string;
  user_id: string;
  period_ym: string;
  period_label: string;
  entry_title: string | null;
  recorded_at: string;
  mood_note: string | null;
  prompts: Partial<Record<CurrentsPromptKey, string>>;
  photo_urls: string[];
  paper_item_id: string | null;
  paper_image_url: string | null;
  paper_title: string | null;
  paper_overlay: CurrentsPaperOverlay | null;
  created_at: string;
  updated_at: string;
};

export type UpsertCurrentsEntryInput = {
  id?: string;
  period_ym: string;
  period_label: string;
  entry_title?: string | null;
  mood_note?: string | null;
  prompts: CurrentsPromptsMap;
  photo_urls: string[];
  paper_item_id?: string | null;
  paper_image_url?: string | null;
  paper_title?: string | null;
  paper_overlay?: CurrentsPaperOverlay | null;
};