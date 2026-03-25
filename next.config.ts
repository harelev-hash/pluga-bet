import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@supabase/ssr', 'cookie'],
};

export default nextConfig;
