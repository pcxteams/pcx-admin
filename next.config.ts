import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // Proxy the Better Auth API to the NestJS backend so the session cookie is
  // set first-party on this origin (like v2's httpOnly token cookie).
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${API_URL}/api/auth/:path*`,
      },
      // Proxy the communications API to the NestJS backend so browser calls
      // carry the first-party session cookie (same reason as the auth rewrite).
      // The API mounts these controllers at the root, so the `/api` prefix is
      // dropped in the destination.
      {
        source: "/api/communications/:path*",
        destination: `${API_URL}/communications/:path*`,
      },
    ];
  },
};

export default nextConfig;
