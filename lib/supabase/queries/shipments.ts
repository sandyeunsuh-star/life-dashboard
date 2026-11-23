import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { ShipmentStatus } from "@/lib/weekly/constants";

import { logSupabaseError } from "../errors";
import { requireAuthUser } from "../require-auth-user";
import type { ShipmentRow } from "../types/shipment";

export async function listShipments(supabase: SupabaseClient) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const { data, error } = await supabase
    .from("shipments")
    .select(
      "id, user_id, label, status, tracking_url, is_delivered, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("is_delivered", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("listShipments", error);
    return { data: null, error };
  }

  return { data: (data ?? []) as ShipmentRow[], error: null };
}

export type CreateShipmentInput = {
  label: string;
  status: ShipmentStatus;
  tracking_url?: string | null;
};

export async function createShipment(
  supabase: SupabaseClient,
  input: CreateShipmentInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const isDelivered = input.status === "Delivered";

  const { data, error } = await supabase
    .from("shipments")
    .insert({
      user_id: user.id,
      label: input.label.trim(),
      status: input.status,
      tracking_url: input.tracking_url?.trim() || null,
      is_delivered: isDelivered,
    })
    .select(
      "id, user_id, label, status, tracking_url, is_delivered, created_at, updated_at",
    )
    .single();

  if (error) {
    logSupabaseError("createShipment", error);
    return { data: null, error: error as PostgrestError };
  }

  return { data: data as ShipmentRow, error: null };
}

export type UpdateShipmentInput = {
  label?: string;
  status?: ShipmentStatus;
  tracking_url?: string | null;
  is_delivered?: boolean;
};

export async function updateShipment(
  supabase: SupabaseClient,
  id: string,
  input: UpdateShipmentInput,
) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { data: null, error: authError };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.label !== undefined) patch.label = input.label.trim();
  if (input.status !== undefined) {
    patch.status = input.status;
    if (input.status === "Delivered") patch.is_delivered = true;
  }
  if (input.tracking_url !== undefined) {
    patch.tracking_url = input.tracking_url?.trim() || null;
  }
  if (input.is_delivered !== undefined) {
    patch.is_delivered = input.is_delivered;
    if (input.is_delivered) patch.status = "Delivered";
  }

  const { data, error } = await supabase
    .from("shipments")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(
      "id, user_id, label, status, tracking_url, is_delivered, created_at, updated_at",
    )
    .single();

  if (error) {
    logSupabaseError("updateShipment", error);
    return { data: null, error: error as PostgrestError };
  }

  return { data: data as ShipmentRow, error: null };
}

export async function deleteShipment(supabase: SupabaseClient, id: string) {
  const { user, error: authError } = await requireAuthUser(supabase);
  if (authError || !user) {
    return { error: authError };
  }

  const { error } = await supabase
    .from("shipments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    logSupabaseError("deleteShipment", error);
    return { error: error as PostgrestError };
  }

  return { error: null };
}