import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { pickRandomGratitudeMemory } from "@/lib/gratitude/smile-jar";
import {
  gratitudeHasSaveableContent,
  gratitudeReasonSnippet,
} from "@/lib/gratitude/validation";
import { createdAtLocalNoonIso, todayLocalDateIso } from "@/lib/tidy/backdate-dates";
import { insertTidyPointLog } from "@/lib/supabase/tidy-point-log";
import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import type {
  GratitudeEntryRow,
  GratitudeSnapshot,
  UpsertGratitudeEntryInput,
} from "../types/gratitude";

const SELECT =
  "id, user_id, entry_date, favorite_thing, favorite_why, favorite_photo_url, glimmer_1, glimmer_2, glimmer_3, points_awarded, created_at, updated_at";

function trimOrNull(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t || null;
}

function normalizeRow(row: Record<string, unknown>): GratitudeEntryRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    entry_date: row.entry_date as string,
    favorite_thing: trimOrNull(row.favorite_thing as string | null),
    favorite_why: trimOrNull(row.favorite_why as string | null),
    favorite_photo_url: trimOrNull(row.favorite_photo_url as string | null),
    glimmer_1: trimOrNull(row.glimmer_1 as string | null),
    glimmer_2: trimOrNull(row.glimmer_2 as string | null),
    glimmer_3: trimOrNull(row.glimmer_3 as string | null),
    points_awarded: Boolean(row.points_awarded),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listGratitudeEntries(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("gratitude_entries")
    .select(SELECT)
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false });

  if (error) {
    logSupabaseError("listGratitudeEntries", error);
    return { data: null, error };
  }

  return {
    data: (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>)),
    error: null,
  };
}

export async function hasGratitudeForDate(
  supabase: SupabaseClient,
  entryDate: string,
): Promise<boolean> {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) return false;

  const { data, error } = await supabase
    .from("gratitude_entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("entry_date", entryDate)
    .maybeSingle();

  if (error) {
    logSupabaseError("hasGratitudeForDate", error);
    return false;
  }
  return Boolean(data);
}

export async function fetchGratitudeSnapshot(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const list = await listGratitudeEntries(supabase);
  if (list.error || !list.data) {
    return { data: null, error: list.error };
  }

  const todayDate = todayLocalDateIso();
  const todayEntry =
    list.data.find((e) => e.entry_date === todayDate) ?? null;

  const snapshot: GratitudeSnapshot = {
    entries: list.data,
    todayEntry,
    todayDate,
    randomMemory: pickRandomGratitudeMemory(list.data, {
      excludeEntryDate: todayEntry ? undefined : todayDate,
    }),
  };

  return { data: snapshot, error: null };
}

export type SaveGratitudeResult = {
  entry: GratitudeEntryRow;
  pointsAwarded: boolean;
};

export async function saveGratitudeEntry(
  supabase: SupabaseClient,
  input: UpsertGratitudeEntryInput,
): Promise<{ data: SaveGratitudeResult | null; error: PostgrestError | null }> {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  if (
    !gratitudeHasSaveableContent({
      favorite_thing: input.favorite_thing,
      glimmer_1: input.glimmer_1,
      glimmer_2: input.glimmer_2,
      glimmer_3: input.glimmer_3,
    })
  ) {
    return {
      data: null,
      error: {
        message: "Add a favorite thing or at least one glimmer",
        code: "validation_error",
      } as PostgrestError,
    };
  }

  const payload = {
    user_id: user.id,
    entry_date: input.entry_date,
    favorite_thing: trimOrNull(input.favorite_thing),
    favorite_why: trimOrNull(input.favorite_why),
    favorite_photo_url: trimOrNull(input.favorite_photo_url),
    glimmer_1: trimOrNull(input.glimmer_1),
    glimmer_2: trimOrNull(input.glimmer_2),
    glimmer_3: trimOrNull(input.glimmer_3),
    updated_at: new Date().toISOString(),
  };

  let existingPointsAwarded = false;
  let row: GratitudeEntryRow | null = null;

  if (input.id) {
    const { data: existing, error: fetchErr } = await supabase
      .from("gratitude_entries")
      .select("points_awarded")
      .eq("id", input.id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr) {
      logSupabaseError("saveGratitudeEntry fetch", fetchErr);
      return { data: null, error: fetchErr };
    }
    existingPointsAwarded = Boolean(existing?.points_awarded);

    const { data, error } = await supabase
      .from("gratitude_entries")
      .update(payload)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .select(SELECT)
      .single();

    if (error) {
      logSupabaseError("saveGratitudeEntry update", error);
      return { data: null, error };
    }
    row = normalizeRow(data as Record<string, unknown>);
  } else {
    const { data: existingByDate } = await supabase
      .from("gratitude_entries")
      .select("id, points_awarded")
      .eq("user_id", user.id)
      .eq("entry_date", input.entry_date)
      .maybeSingle();

    if (existingByDate?.id) {
      existingPointsAwarded = Boolean(existingByDate.points_awarded);
      const { data, error } = await supabase
        .from("gratitude_entries")
        .update(payload)
        .eq("id", existingByDate.id)
        .eq("user_id", user.id)
        .select(SELECT)
        .single();

      if (error) {
        logSupabaseError("saveGratitudeEntry update by date", error);
        return { data: null, error };
      }
      row = normalizeRow(data as Record<string, unknown>);
    } else {
      const { data, error } = await supabase
        .from("gratitude_entries")
        .insert(payload)
        .select(SELECT)
        .single();

      if (error) {
        logSupabaseError("saveGratitudeEntry insert", error);
        return { data: null, error };
      }
      row = normalizeRow(data as Record<string, unknown>);
    }
  }

  let pointsAwarded = false;
  if (!existingPointsAwarded && !row.points_awarded) {
    const reason = `Gratitude: ${gratitudeReasonSnippet(row)}`;
    const log = await insertTidyPointLog(supabase, {
      user_id: user.id,
      points: 5,
      kind: "gratitude",
      reason,
      created_at: createdAtLocalNoonIso(row.entry_date),
      gratitude_entry_id: row.id,
    });

    if (!log.error) {
      const { data: patched, error: patchErr } = await supabase
        .from("gratitude_entries")
        .update({ points_awarded: true, updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("user_id", user.id)
        .select(SELECT)
        .single();

      if (!patchErr && patched) {
        row = normalizeRow(patched as Record<string, unknown>);
        pointsAwarded = true;
      }
    } else {
      logSupabaseError("saveGratitudeEntry points", log.error);
    }
  }

  return {
    data: { entry: row, pointsAwarded },
    error: null,
  };
}

export async function deleteGratitudeEntry(
  supabase: SupabaseClient,
  entryId: string,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { error: authError };
  }

  const { error: logDeleteError } = await supabase
    .from("tidy_point_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("gratitude_entry_id", entryId)
    .eq("kind", "gratitude");

  if (logDeleteError) {
    logSupabaseError("deleteGratitudeEntry logs", logDeleteError);
    return { error: logDeleteError };
  }

  const { error } = await supabase
    .from("gratitude_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (error) {
    logSupabaseError("deleteGratitudeEntry", error);
  }

  return { error };
}