import { google } from "googleapis";
import { NextResponse, type NextRequest } from "next/server";

import { requireSupabaseUser } from "@/lib/api/require-user";
import { getGoogleDriveClient } from "@/lib/google/require-google-auth";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireSupabaseUser();
  if (auth.error) {
    return auth.error;
  }

  const googleAuth = await getGoogleDriveClient();
  if (!googleAuth) {
    return NextResponse.json(
      { error: "Google Drive is not connected" },
      { status: 403 },
    );
  }

  const { fileId } = await context.params;
  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
  }

  const drive = google.drive({ version: "v3", auth: googleAuth.client });

  try {
    const meta = await drive.files.get({
      fileId,
      fields: "mimeType,name",
      supportsAllDrives: true,
    });

    const media = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" },
    );

    const buffer = Buffer.from(media.data as ArrayBuffer);
    const mimeType = meta.data.mimeType ?? "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Failed to fetch Drive image";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}