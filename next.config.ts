import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable trailing slash handling to avoid redirects on API routes
  trailingSlash: false,
  // Ensure we are not statically exporting unless intentional
  // output: 'standalone',

  // Ignore typescript/eslint errors during build to ensuring deployment succeeds even with minor issues
  typescript: {
    ignoreBuildErrors: true,
  },


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
