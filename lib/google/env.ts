function requireEnv(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`Missing ${name} in environment variables`);
  }
  return value.trim();
}

export function getGoogleClientId(): string {
  return requireEnv("GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID);
}

export function getGoogleClientSecret(): string {
  return requireEnv("GOOGLE_CLIENT_SECRET", process.env.GOOGLE_CLIENT_SECRET);
}

/** Fallback redirect URI when no request context (token refresh only). */
export function getGoogleRedirectUriFallback(): string {
  const fromPublic = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromPublic) {
    return `${fromPublic.replace(/\/$/, "")}/api/auth/google/callback`;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel}/api/auth/google/callback`;
  }
  const legacy = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (legacy) {
    return legacy;
  }
  throw new Error(
    "Set NEXT_PUBLIC_SITE_URL (recommended) or GOOGLE_REDIRECT_URI for Google OAuth",
  );
}

export const GOOGLE_DRIVE_READONLY_SCOPE =
  "https://www.googleapis.com/auth/drive.readonly";

export const GOOGLE_OAUTH_COOKIE = "google_drive_oauth";