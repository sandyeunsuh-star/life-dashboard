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

export function getGoogleRedirectUri(): string {
  return requireEnv("GOOGLE_REDIRECT_URI", process.env.GOOGLE_REDIRECT_URI);
}

export const GOOGLE_DRIVE_READONLY_SCOPE =
  "https://www.googleapis.com/auth/drive.readonly";

export const GOOGLE_OAUTH_COOKIE = "google_drive_oauth";