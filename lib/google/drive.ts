import type { drive_v3 } from "googleapis";

export type DriveImageFile = {
  id: string;
  name: string;
  webViewLink: string | null;
  thumbnailLink: string | null;
  mimeType: string | null;
};

const FOLDER_ID_PATTERNS = [
  /\/folders\/([a-zA-Z0-9_-]+)/,
  /^([a-zA-Z0-9_-]{10,})$/,
];

export function extractGoogleDriveFolderId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  for (const pattern of FOLDER_ID_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

const IMAGE_QUERY =
  "mimeType contains 'image/' and trashed = false";

export async function listImageFilesInFolder(
  drive: drive_v3.Drive,
  folderId: string,
): Promise<DriveImageFile[]> {
  const files: DriveImageFile[] = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and ${IMAGE_QUERY}`,
      fields:
        "nextPageToken, files(id, name, mimeType, webViewLink, thumbnailLink)",
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    for (const file of response.data.files ?? []) {
      if (!file.id || !file.name) {
        continue;
      }

      files.push({
        id: file.id,
        name: file.name,
        webViewLink: file.webViewLink ?? null,
        thumbnailLink: file.thumbnailLink ?? null,
        mimeType: file.mimeType ?? null,
      });
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}