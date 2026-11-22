import imageCompression from "browser-image-compression";

const COVER_MAX_WIDTH = 800;

/** Browser-only: crisp WebP cover/banner (max 800px wide). */
export async function compressToWebpCover(imageFile: File): Promise<File> {
  return imageCompression(imageFile, {
    maxWidthOrHeight: COVER_MAX_WIDTH,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.88,
  });
}