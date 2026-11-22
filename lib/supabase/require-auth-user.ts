import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

import { logSupabaseError } from "./errors";

export async function requireAuthUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logSupabaseError("requireAuthUser", error);
    return { user: null, error };
  }

  if (!user) {
    const authError = {
      name: "AuthSessionMissingError",
      message: "Not authenticated",
    } as AuthError;
    logSupabaseError("requireAuthUser", authError);
    return { user: null, error: authError };
  }

  return { user, error: null };
}