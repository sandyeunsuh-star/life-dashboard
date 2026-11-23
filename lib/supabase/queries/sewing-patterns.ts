import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { SewingStatus } from "@/lib/sewing/constants";

import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import type {
  SewingPatternInput,
  SewingPatternRow,
} from "../types/sewing-pattern";

const PATTERN_SELECT =
  "id, user_id, title, designer, category, status, fabric_type, fabric_recs, yardage, notions, size_info, purchase_url, is_wishlist, cover_path, instructions_pdf_path, instructions_drive_url, pattern_pdf_path, pattern_pdf_filename, pattern_drive_url, notes, created_at, updated_at";

function emptyToNull(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

export async function listSewingPatterns(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("sewing_patterns")
    .select(PATTERN_SELECT)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    logSupabaseError("listSewingPatterns", error);
    return { data: null, error };
  }

  return { data: (data ?? []) as SewingPatternRow[], error: null };
}

export async function listSewingDesigners(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("sewing_patterns")
    .select("designer")
    .eq("user_id", user.id)
    .not("designer", "is", null);

  if (error) {
    logSupabaseError("listSewingDesigners", error);
    return { data: null, error };
  }

  const set = new Set<string>();
  for (const row of data ?? []) {
    const d = (row as { designer: string | null }).designer?.trim();
    if (d) set.add(d);
  }

  return { data: [...set].sort((a, b) => a.localeCompare(b)), error: null };
}

export async function createSewingPattern(
  supabase: SupabaseClient,
  input: SewingPatternInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("sewing_patterns")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      designer: emptyToNull(input.designer),
      category: emptyToNull(input.category),
      status: input.status,
      fabric_type: emptyToNull(input.fabric_type),
      fabric_recs: emptyToNull(input.fabric_recs),
      yardage: emptyToNull(input.yardage),
      notions: emptyToNull(input.notions),
      size_info: emptyToNull(input.size_info),
      purchase_url: emptyToNull(input.purchase_url),
      is_wishlist: input.is_wishlist ?? false,
      cover_path: input.cover_path ?? null,
      instructions_pdf_path: input.instructions_pdf_path ?? null,
      instructions_drive_url: emptyToNull(input.instructions_drive_url),
      pattern_pdf_path: input.pattern_pdf_path ?? null,
      pattern_pdf_filename: emptyToNull(input.pattern_pdf_filename),
      pattern_drive_url: emptyToNull(input.pattern_drive_url),
      notes: emptyToNull(input.notes),
    })
    .select(PATTERN_SELECT)
    .single();

  if (error) {
    logSupabaseError("createSewingPattern", error);
    return { data: null, error: error as PostgrestError };
  }

  return { data: data as SewingPatternRow, error: null };
}

export async function updateSewingPattern(
  supabase: SupabaseClient,
  id: string,
  input: Partial<SewingPatternInput>,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.designer !== undefined) patch.designer = emptyToNull(input.designer);
  if (input.category !== undefined) patch.category = emptyToNull(input.category);
  if (input.status !== undefined) patch.status = input.status as SewingStatus;
  if (input.fabric_type !== undefined) {
    patch.fabric_type = emptyToNull(input.fabric_type);
  }
  if (input.fabric_recs !== undefined) {
    patch.fabric_recs = emptyToNull(input.fabric_recs);
  }
  if (input.yardage !== undefined) patch.yardage = emptyToNull(input.yardage);
  if (input.notions !== undefined) patch.notions = emptyToNull(input.notions);
  if (input.size_info !== undefined) {
    patch.size_info = emptyToNull(input.size_info);
  }
  if (input.purchase_url !== undefined) {
    patch.purchase_url = emptyToNull(input.purchase_url);
  }
  if (input.is_wishlist !== undefined) patch.is_wishlist = input.is_wishlist;
  if (input.cover_path !== undefined) patch.cover_path = input.cover_path;
  if (input.instructions_pdf_path !== undefined) {
    patch.instructions_pdf_path = input.instructions_pdf_path;
  }
  if (input.instructions_drive_url !== undefined) {
    patch.instructions_drive_url = emptyToNull(input.instructions_drive_url);
  }
  if (input.pattern_pdf_path !== undefined) {
    patch.pattern_pdf_path = input.pattern_pdf_path;
  }
  if (input.pattern_pdf_filename !== undefined) {
    patch.pattern_pdf_filename = emptyToNull(input.pattern_pdf_filename);
  }
  if (input.pattern_drive_url !== undefined) {
    patch.pattern_drive_url = emptyToNull(input.pattern_drive_url);
  }
  if (input.notes !== undefined) patch.notes = emptyToNull(input.notes);

  const { data, error } = await supabase
    .from("sewing_patterns")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(PATTERN_SELECT)
    .single();

  if (error) {
    logSupabaseError("updateSewingPattern", error);
    return { data: null, error: error as PostgrestError };
  }

  return { data: data as SewingPatternRow, error: null };
}

export async function moveSewingPatternToLibrary(
  supabase: SupabaseClient,
  id: string,
) {
  return updateSewingPattern(supabase, id, {
    is_wishlist: false,
    status: "In Queue",
  });
}

export async function deleteSewingPattern(supabase: SupabaseClient, id: string) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { error: authError };
  }

  const { error } = await supabase
    .from("sewing_patterns")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    logSupabaseError("deleteSewingPattern", error);
    return { error: error as PostgrestError };
  }

  return { error: null };
}