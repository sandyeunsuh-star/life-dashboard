import type { QuickCopySettings, RecurringTemplate } from "@/lib/weekly/constants";

export type UserSettingsRow = {
  user_id: string;
  quick_copy: QuickCopySettings;
  recurring_template: RecurringTemplate;
  updated_at: string;
};