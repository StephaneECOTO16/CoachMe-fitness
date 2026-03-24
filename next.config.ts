/**
 * next.config.ts
 *
 * Security headers are applied in src/middleware.ts rather than here
 * so they are also applied to edge routes and API handlers consistently.
 * This file focuses on image optimisation and build configuration.
 */

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Prisma must be excluded from the edge runtime bundle
  serverExternalPackages: ["@prisma/client", "prisma", "bcrypt"],

  images: {
    // Remove 'unoptimized' — Next.js will now optimise R2 images
    // (resize, convert to WebP, cache at the CDN layer)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        // R2 public bucket — matches both the env var value and NEXT_PUBLIC_R2_URL
        protocol: "https",
        hostname: "pub-*.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/api/**",
      },
      {
        protocol: "https",
        hostname: "media.mandarafitness.com",
        pathname: "/**",
      },
    ],
  },

  // Strict mode catches double-invoke bugs in development
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
