import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents left off: every page is per-user and reads cookies, so prerendering gains nothing.
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
