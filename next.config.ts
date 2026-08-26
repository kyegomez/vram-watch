import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't advertise the framework, and keep one canonical URL shape
  // (no trailing slash) so crawlers never see two URLs for one page.
  poweredByHeader: false,
  trailingSlash: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Generated art doesn't change between deploys — let the CDN keep it.
        source: "/:path*(icon.svg|apple-icon|opengraph-image)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/(robots.txt|sitemap.xml|manifest.webmanifest)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
