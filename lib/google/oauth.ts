import { google } from "googleapis";

import {
  getGoogleClientId,
  getGoogleClientSecret,
  getGoogleRedirectUri,
  GOOGLE_DRIVE_READONLY_SCOPE,
} from "./env";

export function createGoogleOAuth2Client() {
  return new google.auth.OAuth2(
    getGoogleClientId(),
    getGoogleClientSecret(),
    getGoogleRedirectUri(),
  );
}

export function getGoogleConsentUrl(state: string): string {
  const client = createGoogleOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [GOOGLE_DRIVE_READONLY_SCOPE],
    state,
  });
}

export async function exchangeGoogleAuthCode(code: string) {
  const client = createGoogleOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  return tokens;
}

export type StoredGoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
};

export function serializeGoogleTokens(tokens: StoredGoogleTokens): string {
  return Buffer.from(JSON.stringify(tokens), "utf8").toString("base64url");
}

export function parseGoogleTokensCookie(
  value: string | undefined,
): StoredGoogleTokens | null {
  if (!value) {
    return null;
  }
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as StoredGoogleTokens;
    if (!parsed.access_token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export const googleTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};