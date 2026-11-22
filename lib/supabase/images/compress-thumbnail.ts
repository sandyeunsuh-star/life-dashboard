import imageCompression from "browser-image-compression";

const THUMBNAIL_MAX_WIDTH = 400;

/** Browser-only: produces a lightweight WebP thumbnail (max 400px wide). */
export async function compressToWebpThumbnail(imageFile: File): Promise<File> {
  return imageCompression(imageFile, {
    maxWidthOrHeight: THUMBNAIL_MAX_WIDTH,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.82,
  });
}