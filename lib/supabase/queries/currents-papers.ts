import type { SupabaseClient } from "@supabase/supabase-js";

import { isPaperItemFromMetadata } from "@/lib/supabase/items/item-thumbnail-fit";
import {
  itemFullImageUrl,
  itemThumbUrl,
} from "@/lib/supabase/items/item-display-image-url";
import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import type { CurrentsDigitalPaper } from "../types/currents-paper";

type ItemRow = {
  id: string;
  title: string;
  thumbnail_url: string;
  drive_url: string | null;
  metadata: Record<string, string> | null;
  collection_id: string;
  collections: { name: string } | { name: string }[] | null;
};

export async function listDigitalPapersForCurrents(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("items")
    .select(
      "id, title, thumbnail_url, drive_url, metadata, collection_id, collections ( name )",
    )
    .eq("user_id", user.id)
    .order("title", { ascending: true });

  if (error) {
    logSupabaseError("listDigitalPapersForCurrents", error);
    return { data: null, error };
  }

  const papers: CurrentsDigitalPaper[] = [];

  for (const raw of data ?? []) {
    const row = raw as ItemRow;
    const thumbUrl = itemThumbUrl(row.thumbnail_url);
    if (!thumbUrl) continue;
    if (!isPaperItemFromMetadata(row.metadata ?? undefined)) continue;

    const fullUrl =
      itemFullImageUrl({
        thumbnail_url: row.thumbnail_url,
        drive_url: row.drive_url,
        metadata: row.metadata ?? undefined,
      }) ?? thumbUrl;

    const collectionEmbed = row.collections;
    const collectionName = Array.isArray(collectionEmbed)
      ? collectionEmbed[0]?.name
      : collectionEmbed?.name;

    papers.push({
      itemId: row.id,
      title: row.title.trim() || "Untitled paper",
      thumbUrl,
      fullUrl,
      collectionId: row.collection_id,
      collectionName: collectionName?.trim() || "Collection",
    });
  }

  return { data: papers, error: null };
}