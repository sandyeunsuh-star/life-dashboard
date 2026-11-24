"use server";

import { revalidatePath } from "next/cache";

/** Invalidate Tidy Guild server data after points change on Weekly or Vault. */
export async function revalidateTidyGuild() {
  revalidatePath("/tidy-guild");
}