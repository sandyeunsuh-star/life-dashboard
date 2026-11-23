const STORAGE_PREFIX = "life-dashboard:signed-url:";
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

type CachedSignedUrl = {
  url: string;
  expiresAt: number;
};

export async function getCachedSignedUrl(
  cacheKey: string,
  fetchUrl: () => Promise<{ url: string | null }>,
  ttlSec: number,
): Promise<string | null> {
  const now = Date.now();

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedSignedUrl;
        if (
          parsed.url &&
          typeof parsed.expiresAt === "number" &&
          parsed.expiresAt > now + REFRESH_BUFFER_MS
        ) {
          return parsed.url;
        }
      }
    } catch {
      /* ignore invalid cache */
    }
  }

  const { url } = await fetchUrl();
  if (!url) {
    return null;
  }

  const entry: CachedSignedUrl = {
    url,
    expiresAt: now + ttlSec * 1000,
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        STORAGE_PREFIX + cacheKey,
        JSON.stringify(entry),
      );
    } catch {
      /* quota */
    }
  }

  return url;
}

export function clearCachedSignedUrl(cacheKey: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + cacheKey);
  } catch {
    /* ignore */
  }
}