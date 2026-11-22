import type { SupabaseClient } from "@supabase/supabase-js";

import { logSupabaseError } from "../errors";
import {
  getTagCountsFromTagArrays,
  type TagSuggestion,
} from "../items/tag-suggestions";
import { requireAuthUser } from "../require-auth-user";

export async function listUserTagsWithCounts(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const result = await supabase
    .from("items")
    .select("tags")
    .eq("user_id", user.id);

  if (result.error) {
    logSupabaseError("listUserTagsWithCounts", result.error);
    return result;
  }

  const tagRows = (result.data ?? []).map(
    (row) => (row.tags as string[]) ?? [],
  );
  const suggestions = getTagCountsFromTagArrays(tagRows);

  return { data: suggestions as TagSuggestion[], error: null };
}