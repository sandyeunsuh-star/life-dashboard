import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { createdAtLocalNoonIso } from "@/lib/tidy/backdate-dates";
import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";

export async function updateTidyPointLogCreatedAt(
  supabase: SupabaseClient,
  logId: string,
  dateYmd: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { error: authError };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) {
    return {
      error: {
        message: "Invalid date",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const created_at = createdAtLocalNoonIso(dateYmd);
  const { error } = await supabase
    .from("tidy_point_logs")
    .update({ created_at })
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) {
    logSupabaseError("updateTidyPointLogCreatedAt", error);
  }
  return { error: error as PostgrestError | null };
}