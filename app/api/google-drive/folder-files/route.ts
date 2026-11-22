import { google } from "googleapis";
import { NextResponse } from "next/server";

import { requireSupabaseUser } from "@/lib/api/require-user";
import {
  extractGoogleDriveFolderId,
  listImageFilesInFolder,
} from "@/lib/google/drive";
import { getGoogleDriveClient } from "@/lib/google/require-google-auth";
import { listItemDriveUrlsInCollection } from "@/lib/supabase/queries/items";

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

    const { data: existingDriveUrls, error } = await listItemDriveUrlsInCollection(
      auth.supabase!,
      body.collectionId,
    );

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to load existing items" },
        { status: 500 },
      );
    }

    const existingSet = new Set(existingDriveUrls ?? []);
    const importable = files.filter((file) => {
      const link = file.webViewLink;
      return !link || !existingSet.has(link);
    });
    const skipped = files.length - importable.length;

    return Response.json({
      folderId,
      files: importable,
      skippedDuplicates: skipped,
      totalInFolder: files.length,
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Failed to list Drive files";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}