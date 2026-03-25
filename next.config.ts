import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    resolveAlias: {
      cookie: './node_modules/cookie/dist/index.js',
    },
  },
};

export default nextConfig;
