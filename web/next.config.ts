import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Turbopack persistent caches (default-on since Next 16.1) are disabled:
  // - dev: on this machine the cache caused stale-task panics after hard
  //   restarts and OOM aborts (16MB alloc failed) during cold compiles of
  //   the heavy dashboard route; without it dev compiles stay lean.
  // - build: Render builds run in fresh containers that never carry
  //   .next/cache over, so the write-only cache is skipped (docs rec).
  experimental: {
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
    // Defer compiling the heavy dashboard widgets (Bryntum ~4.4MB bundle,
    // AG Grid) until the browser actually requests their chunks — the
    // eager cold compile of the whole route exhausted memory on this
    // machine (Rust alloc failure at ~8GB). No effect on production builds.
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
