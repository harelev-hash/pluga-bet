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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Block all search engine indexing at HTTP level
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          // Prevent embedding in iframes (clickjacking)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stop browser from guessing content types
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Don't send referrer to external sites
          { key: 'Referrer-Policy', value: 'no-referrer' },
          // Basic XSS protection for older browsers
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
};

export default nextConfig;
