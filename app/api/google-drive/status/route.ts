import { isGoogleDriveConnected } from "@/lib/google/require-google-auth";
import { requireSupabaseUser } from "@/lib/api/require-user";

export async function GET() {
  const auth = await requireSupabaseUser();
  if (auth.error) {
    return auth.error;
  }

  const connected = await isGoogleDriveConnected();
  return Response.json({ connected });
}