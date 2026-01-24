import type { NextConfig } from "next";

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
