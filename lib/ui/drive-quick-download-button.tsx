"use client";

import { Download } from "lucide-react";

import { triggerGoogleDriveDownload } from "@/lib/google/drive-url";

type DriveQuickDownloadButtonProps = {
  driveUrl: string | null | undefined;
  className?: string;
  title?: string;
};

export function DriveQuickDownloadButton({
  driveUrl,
  className = "",
  title = "Download original from Google Drive",
}: DriveQuickDownloadButtonProps) {
  if (!driveUrl?.trim()) return null;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        triggerGoogleDriveDownload(driveUrl);
      }}
      className={`inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white/95 p-1.5 text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white ${className}`}
    >
      <Download className="size-3.5" aria-hidden />
    </button>
  );
}