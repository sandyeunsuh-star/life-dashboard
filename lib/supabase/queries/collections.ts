import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import { slugifyName } from "../slug";
import type {
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput,
} from "../types/collection";

async function resolveUniqueSlug(
  supabase: SupabaseClient,
  userId: string,
  name: string,
): Promise<{ slug: string; error: PostgrestError | null }> {
  const base = slugifyName(name);
  let slug = base;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from("collections")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      logSupabaseError("resolveUniqueSlug", error);
      return { slug: "", error };
    }

    if (!data) {
      return { slug, error: null };
    }

    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function listCollections(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const result = await supabase
    .from("collections")
    .select("id, user_id, name, description, slug, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Collection[]>();

  if (result.error) {
    logSupabaseError("listCollections", result.error);
  }

  return result;
}

export async function getCollectionBySlug(
  supabase: SupabaseClient,
  slug: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const result = await supabase
    .from("collections")
    .select("id, user_id, name, description, slug, created_at")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .maybeSingle()
    .returns<Collection>();

  if (result.error) {
    logSupabaseError("getCollectionBySlug", result.error);
  }

  return result;
}

export async function createCollection(
  supabase: SupabaseClient,
  input: CreateCollectionInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const name = input.name.trim();
  if (!name) {
    const validationError = {
      message: "Name is required",
      code: "validation_error",
    } as PostgrestError;
    return { data: null, error: validationError };
  }

  const { slug, error: slugError } = await resolveUniqueSlug(
    supabase,
    user.id,
    name,
  );
  if (slugError) {
    return { data: null, error: slugError };
  }

  const description = input.description?.trim() || null;

  const result = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      name,
      description,
      slug,
    })
    .select("id, user_id, name, description, slug, created_at")
    .single()
    .returns<Collection>();

  if (result.error) {
    logSupabaseError("createCollection", result.error);
  }

  return result;
}

export async function updateCollection(
  supabase: SupabaseClient,
  input: UpdateCollectionInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const name = input.name.trim();
  if (!name) {
    const validationError = {
      message: "Name is required",
      code: "validation_error",
    } as PostgrestError;
    return { data: null, error: validationError };
  }

  const description = input.description?.trim() || null;

  const result = await supabase
    .from("collections")
    .update({ name, description })
    .eq("id", input.collectionId)
    .eq("user_id", user.id)
    .select("id, user_id, name, description, slug, created_at")
    .single()
    .returns<Collection>();

  if (result.error) {
    logSupabaseError("updateCollection", result.error);
  }

  return result;
}