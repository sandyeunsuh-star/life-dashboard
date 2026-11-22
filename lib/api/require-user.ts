import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { createServerClientInstance } from "@/lib/supabase/server";

export async function requireSupabaseUser() {
  const supabase = await createServerClientInstance();
  const { user, error } = await getAuthenticatedUser(supabase);

  if (error || !user) {
    return {
      user: null,
      supabase: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user, supabase, error: null };
}