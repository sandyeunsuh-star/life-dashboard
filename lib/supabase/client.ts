import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Browser Supabase client — use for client-side auth and mutations so the
 * user's session JWT is attached to inserts/updates (RLS).
 */
export function createBrowserClientInstance(): SupabaseClient {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}

/** @deprecated Use createBrowserClientInstance — kept for existing imports. */
export function createClient() {
  return createBrowserClientInstance();
}