export type CurrentsPaperOverlay = "vellum" | "moody";

export const CURRENTS_PAPER_OVERLAY_DEFAULT: CurrentsPaperOverlay = "vellum";

export function normalizePaperOverlay(
  raw: unknown,
): CurrentsPaperOverlay | null {
  if (raw === "moody") return "moody";
  if (raw === "vellum") return "vellum";
  return null;
}

export function currentsSpreadMatClass(overlay: CurrentsPaperOverlay): string {
  return overlay === "moody"
    ? "bg-zinc-950/85 text-stone-100 backdrop-blur-[2px]"
    : "bg-[#FAF8F5]/88 text-zinc-900 backdrop-blur-[2px]";
}