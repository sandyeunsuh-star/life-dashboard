import { revalidateTidyGuild } from "@/app/actions/revalidate-tidy-guild";
import { revalidateWeeklyHome } from "@/app/actions/revalidate-weekly-home";

/** Call after any client-side action that writes `tidy_point_logs`. */
export async function revalidateAfterTidyPoints() {
  try {
    await Promise.all([revalidateTidyGuild(), revalidateWeeklyHome()]);
  } catch (err) {
    console.error("[tidy] revalidate after points failed:", err);
  }
}