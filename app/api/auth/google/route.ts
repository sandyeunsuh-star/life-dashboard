import { NextResponse, type NextRequest } from "next/server";

import { googleOAuthRedirectUri } from "@/lib/google/request-origin";
import { getGoogleConsentUrl } from "@/lib/google/oauth";
import { requireSupabaseUser } from "@/lib/api/require-user";

export async function GET(request: NextRequest) {
  const auth = await requireSupabaseUser();
  if (auth.error) {
    return auth.error;
  }

  const returnTo =
    request.nextUrl.searchParams.get("returnTo")?.trim() || "/";

  const state = Buffer.from(
    JSON.stringify({ returnTo, uid: auth.user!.id }),
    "utf8",
  ).toString("base64url");

  const redirectUri = googleOAuthRedirectUri(request);
  const consentUrl = getGoogleConsentUrl(state, redirectUri);
  return NextResponse.redirect(consentUrl);
}