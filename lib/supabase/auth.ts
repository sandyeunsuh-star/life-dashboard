import type { SupabaseClient } from "@supabase/supabase-js";

export async function signInWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut(supabase: SupabaseClient) {
  return supabase.auth.signOut();
}

export async function getAuthenticatedUser(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return { user: null, error };
  }
  return { user: data.user, error: null };
}