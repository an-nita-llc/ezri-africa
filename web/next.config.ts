import type { NextConfig } from "next";

// Standalone output is only for the Docker image (CI sets NEXT_OUTPUT).
// The Git-backed Render service runs `next start`, which does not support
// standalone output, so it keeps the default build shape.
const isStandalone = process.env.NEXT_OUTPUT === "standalone";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(isStandalone ? { output: "standalone" as const } : {}),
  // Production builds do not need source maps for prerender errors or the
  // browser bundle; keeping both off lowers peak build memory.
  enablePrerenderSourceMaps: false,
  productionBrowserSourceMaps: false,
  experimental: {
    // Turbopack persistent caches (default-on since Next 16.1) are disabled:
    // - dev: on the original dev machine the cache caused stale-task panics
    //   after hard restarts and OOM aborts during cold compiles of the heavy
    //   dashboard route; without it dev compiles stay lean.
    // - build: CI build containers are fresh, so a write-only cache is skipped.
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
    // Defer compiling lazily imported dashboard widgets until the browser
    // requests their chunks. Dev-only; production builds still emit chunks.
    turbopackLazyDynamicImports: true,
  },
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
