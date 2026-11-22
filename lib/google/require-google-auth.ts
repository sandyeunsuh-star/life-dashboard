import type { OAuth2Client } from "google-auth-library";
import { cookies } from "next/headers";

import {
  createGoogleOAuth2Client,
  parseGoogleTokensCookie,
  serializeGoogleTokens,
  type StoredGoogleTokens,
} from "./oauth";
import { GOOGLE_OAUTH_COOKIE } from "./env";
import { googleTokenCookieOptions } from "./oauth";

async function refreshTokensIfNeeded(
  client: OAuth2Client,
  tokens: StoredGoogleTokens,
): Promise<{ tokens: StoredGoogleTokens; refreshed: boolean }> {
  const expiry = tokens.expiry_date ?? 0;
  const needsRefresh = expiry > 0 && expiry <= Date.now() + 60_000;

  if (!needsRefresh) {
    return { tokens, refreshed: false };
  }

  if (!tokens.refresh_token) {
    return { tokens, refreshed: false };
  }

  client.setCredentials(tokens);
  const { credentials } = await client.refreshAccessToken();

  const merged: StoredGoogleTokens = {
    access_token: credentials.access_token ?? tokens.access_token,
    refresh_token: credentials.refresh_token ?? tokens.refresh_token,
    expiry_date: credentials.expiry_date ?? tokens.expiry_date,
    token_type: credentials.token_type ?? tokens.token_type,
    scope: credentials.scope ?? tokens.scope,
  };

  return { tokens: merged, refreshed: true };
}

export async function getGoogleDriveClient(): Promise<{
  client: OAuth2Client;
  tokens: StoredGoogleTokens;
} | null> {
  const cookieStore = await cookies();
  const stored = parseGoogleTokensCookie(
    cookieStore.get(GOOGLE_OAUTH_COOKIE)?.value,
  );

  if (!stored) {
    return null;
  }

  const client = createGoogleOAuth2Client();
  const { tokens, refreshed } = await refreshTokensIfNeeded(client, stored);
  client.setCredentials(tokens);

  if (refreshed) {
    cookieStore.set(
      GOOGLE_OAUTH_COOKIE,
      serializeGoogleTokens(tokens),
      googleTokenCookieOptions,
    );
  }

  return { client, tokens };
}

export async function isGoogleDriveConnected(): Promise<boolean> {
  const session = await getGoogleDriveClient();
  return session !== null && Boolean(session.tokens.access_token);
}