import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    resolveAlias: {
      cookie: './lib/cookie-shim.js',
    },
  },
};

export default nextConfig;
