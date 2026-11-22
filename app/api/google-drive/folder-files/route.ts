import { google } from "googleapis";
import { NextResponse } from "next/server";

import { requireSupabaseUser } from "@/lib/api/require-user";
import {
  extractGoogleDriveFolderId,
  listImageFilesInFolder,
  type DriveImageFile,
} from "@/lib/google/drive";
import { getGoogleDriveClient } from "@/lib/google/require-google-auth";
import { parseItemMetadata } from "@/lib/supabase/metadata/schema";
import { titleStillEqualsRawFileName } from "@/lib/supabase/metadata/clean-item-title";
import { listItemsForDriveFolderSync } from "@/lib/supabase/queries/items";

type FolderFilesBody = {
  folderUrl?: string;
  folderId?: string;
  collectionId?: string;
};

export async function POST(request: Request) {
  const auth = await requireSupabaseUser();
  if (auth.error) {
    return auth.error;
  }

  const googleAuth = await getGoogleDriveClient();
  if (!googleAuth) {
    return NextResponse.json(
      { error: "Google Drive is not connected", code: "not_connected" },
      { status: 403 },
    );
  }

  let body: FolderFilesBody;
  try {
    body = (await request.json()) as FolderFilesBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const folderId =
    extractGoogleDriveFolderId(body.folderId ?? "") ??
    extractGoogleDriveFolderId(body.folderUrl ?? "");

  if (!folderId) {
    return NextResponse.json(
      { error: "Could not parse Google Drive folder ID or URL" },
      { status: 400 },
    );
  }

  if (!body.collectionId) {
    return NextResponse.json(
      { error: "collectionId is required" },
      { status: 400 },
    );
  }

  const drive = google.drive({ version: "v3", auth: googleAuth.client });

  try {
    const files = await listImageFilesInFolder(drive, folderId);

    const { data: existingItems, error } = await listItemsForDriveFolderSync(
      auth.supabase!,
      body.collectionId,
    );

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to load existing items" },
        { status: 500 },
      );
    }

    const importable: DriveImageFile[] = [];
    const titleUpdates: { itemId: string; fileName: string }[] = [];
    let skippedDuplicates = 0;

    for (const file of files) {
      const link = file.webViewLink;
      const match = (existingItems ?? []).find((item) => {
        if (link && item.drive_url === link) {
          return true;
        }
        const meta = parseItemMetadata(item.metadata);
        return meta.file_name?.trim() === file.name.trim();
      });

      if (!match) {
        importable.push(file);
        continue;
      }

      if (titleStillEqualsRawFileName(match, file.name)) {
        titleUpdates.push({ itemId: match.id, fileName: file.name });
      }
      skippedDuplicates += 1;
    }

    return Response.json({
      folderId,
      files: importable,
      titleUpdates,
      skippedDuplicates,
      totalInFolder: files.length,
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Failed to list Drive files";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}