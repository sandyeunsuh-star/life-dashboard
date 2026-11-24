export function logCollectionCoverImageError(
  src: string,
  context: string,
  extra?: Record<string, unknown>,
): void {
  console.error("[collections] Cover image failed to load", {
    src,
    context,
    ...extra,
  });
}