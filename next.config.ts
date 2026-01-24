import type { NextConfig } from "next";

// Forced rebuild trigger: 2026-01-24T19:58

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/.well-known/carddav',
        destination: '/api/dav',
      },
    ];
  },
};

export default nextConfig;
