import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { requireSupabaseUser } from "@/lib/api/require-user";
import {
  exchangeGoogleAuthCode,
  serializeGoogleTokens,
} from "@/lib/google/oauth";
import { GOOGLE_OAUTH_COOKIE } from "@/lib/google/env";
import { googleTokenCookieOptions } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const auth = await requireSupabaseUser();
  if (auth.error) {
    return auth.error;
  }

  const code = request.nextUrl.searchParams.get("code");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(oauthError)}`, request.url),
    );
  }

  if (!code || !stateRaw) {
    return NextResponse.json(
      { error: "Missing OAuth code or state" },
      { status: 400 },
    );
  }

  let returnTo = "/";
  try {
    const state = JSON.parse(
      Buffer.from(stateRaw, "base64url").toString("utf8"),
    ) as { returnTo?: string; uid?: string };

    if (state.uid !== auth.user!.id) {
      return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
    }

    returnTo = state.returnTo?.startsWith("/") ? state.returnTo : "/";
  } catch {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  try {
    const tokens = await exchangeGoogleAuthCode(code);
    if (!tokens.access_token) {
      return NextResponse.json(
        { error: "Google did not return an access token" },
        { status: 502 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(
      GOOGLE_OAUTH_COOKIE,
      serializeGoogleTokens({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? undefined,
        expiry_date: tokens.expiry_date ?? undefined,
        token_type: tokens.token_type ?? undefined,
        scope: tokens.scope ?? undefined,
      }),
      googleTokenCookieOptions,
    );

    return NextResponse.redirect(new URL(returnTo, request.url));
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Google OAuth failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}