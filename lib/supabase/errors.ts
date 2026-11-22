import type { AuthError, PostgrestError } from "@supabase/supabase-js";

type SupabaseLikeError = Partial<
  PostgrestError & AuthError & { message?: string; status?: number }
>;

/** Full Supabase / PostgREST error string (never truncated). */
export function formatSupabaseError(error: unknown): string {
  if (error == null) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error && !("code" in error)) {
    return error.message;
  }

  const record = error as SupabaseLikeError;

  return [
    record.message,
    record.code ? `code: ${record.code}` : null,
    record.details ? `details: ${record.details}` : null,
    record.hint ? `hint: ${record.hint}` : null,
    record.status != null ? `status: ${record.status}` : null,
    record.name ? `name: ${record.name}` : null,
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" — ");
}

export function logSupabaseError(context: string, error: unknown): void {
  console.error(`[supabase] ${context}:`, formatSupabaseError(error));
}