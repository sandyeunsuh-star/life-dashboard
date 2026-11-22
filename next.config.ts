import type { NextConfig } from "next";

function getSupabaseImageHost(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) {
    return undefined;
  }
  try {
    const base = raw.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
    return new URL(base).hostname;
  } catch {
    return undefined;
  }
}

const supabaseHost = getSupabaseImageHost();

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: supabaseHost
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/collection-assets/**",
          },
        ],
      }
    : undefined,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
