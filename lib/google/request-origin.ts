import type { NextRequest } from "next/server";

function trimTrailingSlash(origin: string): string {
  return origin.replace(/\/$/, "");
}

/** Public site origin for redirects and OAuth (request-first, then env). */
export function resolveSiteOrigin(request: Request | NextRequest): string {
  const url = new URL(request.url);

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]!.trim();
    return trimTrailingSlash(`${forwardedProto}://${host}`);
  }

  const host = request.headers.get("host")?.trim();
  if (host) {
    const proto = url.protocol.replace(":", "") || "http";
    return trimTrailingSlash(`${proto}://${host}`);
  }

  const originHeader = request.headers.get("origin")?.trim();
  if (originHeader) {
    return trimTrailingSlash(originHeader);
  }

  const fromPublic = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromPublic) {
    return trimTrailingSlash(fromPublic);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return trimTrailingSlash(`https://${vercel}`);
  }

  return trimTrailingSlash(url.origin);
}

export const GOOGLE_OAUTH_CALLBACK_PATH = "/api/auth/google/callback";

export function googleOAuthRedirectUri(request: Request | NextRequest): string {
  return `${resolveSiteOrigin(request)}${GOOGLE_OAUTH_CALLBACK_PATH}`;
}