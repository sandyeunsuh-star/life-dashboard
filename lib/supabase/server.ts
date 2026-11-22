import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * SSR server Supabase client — session is read from Next.js cookies so
 * PostgREST requests include the user JWT for RLS (`auth.uid()`).
 */
export async function createServerClientInstance(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll from a Server Component — middleware refreshes the session.
        }
      },
    },
  });
}

/** @deprecated Use createServerClientInstance — kept for existing imports. */
export async function createClient() {
  return createServerClientInstance();
}