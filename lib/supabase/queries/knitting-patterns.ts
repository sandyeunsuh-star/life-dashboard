import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { KnittingStatus } from "@/lib/knitting/constants";

import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import type {
  KnittingPatternInput,
  KnittingPatternRow,
} from "../types/knitting-pattern";

const PATTERN_SELECT =
  "id, user_id, title, designer, category, status, yarn_weight, needle_size, gauge, yardage, cover_path, pdf_path, pdf_filename, notes, is_wishlist, purchase_url, created_at, updated_at";

function emptyToNull(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

export async function listKnittingPatterns(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("knitting_patterns")
    .select(PATTERN_SELECT)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    logSupabaseError("listKnittingPatterns", error);
    return { data: null, error };
  }

  return { data: (data ?? []) as KnittingPatternRow[], error: null };
}

export async function listKnittingDesigners(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("knitting_patterns")
    .select("designer")
    .eq("user_id", user.id)
    .not("designer", "is", null);

  if (error) {
    logSupabaseError("listKnittingDesigners", error);
    return { data: null, error };
  }

  const set = new Set<string>();
  for (const row of data ?? []) {
    const d = (row as { designer: string | null }).designer?.trim();
    if (d) set.add(d);
  }

  return { data: [...set].sort((a, b) => a.localeCompare(b)), error: null };
}

export async function createKnittingPattern(
  supabase: SupabaseClient,
  input: KnittingPatternInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("knitting_patterns")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      designer: emptyToNull(input.designer),
      category: emptyToNull(input.category),
      status: input.status,
      yarn_weight: emptyToNull(input.yarn_weight),
      needle_size: emptyToNull(input.needle_size),
      gauge: emptyToNull(input.gauge),
      yardage: emptyToNull(input.yardage),
      cover_path: input.cover_path ?? null,
      pdf_path: input.pdf_path ?? null,
      pdf_filename: emptyToNull(input.pdf_filename),
      notes: emptyToNull(input.notes),
      is_wishlist: input.is_wishlist ?? false,
      purchase_url: emptyToNull(input.purchase_url),
    })
    .select(PATTERN_SELECT)
    .single();

  if (error) {
    logSupabaseError("createKnittingPattern", error);
    return { data: null, error: error as PostgrestError };
  }

  return { data: data as KnittingPatternRow, error: null };
}

export async function updateKnittingPattern(
  supabase: SupabaseClient,
  id: string,
  input: Partial<KnittingPatternInput>,
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
  if (input.status !== undefined) patch.status = input.status as KnittingStatus;
  if (input.yarn_weight !== undefined) {
    patch.yarn_weight = emptyToNull(input.yarn_weight);
  }
  if (input.needle_size !== undefined) {
    patch.needle_size = emptyToNull(input.needle_size);
  }
  if (input.gauge !== undefined) patch.gauge = emptyToNull(input.gauge);
  if (input.yardage !== undefined) patch.yardage = emptyToNull(input.yardage);
  if (input.cover_path !== undefined) patch.cover_path = input.cover_path;
  if (input.pdf_path !== undefined) patch.pdf_path = input.pdf_path;
  if (input.pdf_filename !== undefined) {
    patch.pdf_filename = emptyToNull(input.pdf_filename);
  }
  if (input.notes !== undefined) patch.notes = emptyToNull(input.notes);
  if (input.is_wishlist !== undefined) patch.is_wishlist = input.is_wishlist;
  if (input.purchase_url !== undefined) {
    patch.purchase_url = emptyToNull(input.purchase_url);
  }

  const { data, error } = await supabase
    .from("knitting_patterns")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(PATTERN_SELECT)
    .single();

  if (error) {
    logSupabaseError("updateKnittingPattern", error);
    return { data: null, error: error as PostgrestError };
  }

  return { data: data as KnittingPatternRow, error: null };
}

export async function moveKnittingPatternToLibrary(
  supabase: SupabaseClient,
  id: string,
) {
  return updateKnittingPattern(supabase, id, {
    is_wishlist: false,
    status: "In Queue",
  });
}

export async function deleteKnittingPattern(
  supabase: SupabaseClient,
  id: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { error: authError };
  }

  const { error } = await supabase
    .from("knitting_patterns")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    logSupabaseError("deleteKnittingPattern", error);
    return { error: error as PostgrestError };
  }

  return { error: null };
}