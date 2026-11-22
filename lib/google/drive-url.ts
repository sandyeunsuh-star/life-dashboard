/** Extract Google Drive file ID from common share URL shapes. */
export function extractGoogleDriveFileId(
  driveUrl: string | null | undefined,
): string | null {
  if (!driveUrl?.trim()) return null;

  const url = driveUrl.trim();

  const filePathMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (filePathMatch?.[1]) {
    return filePathMatch[1];
  }

  try {
    const parsed = new URL(url);
    const idParam = parsed.searchParams.get("id");
    if (idParam) return idParam;
  } catch {
    // fall through
  }

  const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return queryMatch?.[1] ?? null;
}

export function googleDriveDirectDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

/** Open a direct Drive download (or fall back to opening the raw URL). */
export function triggerGoogleDriveDownload(
  driveUrl: string | null | undefined,
): void {
  if (!driveUrl?.trim()) return;

  const fileId = extractGoogleDriveFileId(driveUrl);
  const target = fileId
    ? googleDriveDirectDownloadUrl(fileId)
    : driveUrl.trim();

  window.open(target, "_blank", "noopener,noreferrer");
}