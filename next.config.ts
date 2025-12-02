import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Optionally tighten Blob image host via env (exact hostname, no protocol)
const blobHost = process.env.NEXT_PUBLIC_BLOB_HOST?.replace(
  /^https?:\/\//,
  ""
)?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: {
    // Prefer AVIF (smallest), fallback to WebP. Both are much smaller than JPEG/PNG.
    formats: ["image/avif", "image/webp"] as const,
    // Device breakpoints for srcset generation. Removed 4K sizes to reduce cache variants.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Sizes for fixed-width images (icons, avatars, thumbnails)
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      ...(blobHost
        ? [
            // Tight, exact bucket host
            { protocol: "https" as const, hostname: blobHost },
          ]
        : [
            // Fallback: allow any Vercel Blob host (dev convenience)
            {
              protocol: "https" as const,
              hostname: "**.public.blob.vercel-storage.com",
            },
            {
              protocol: "https" as const,
              hostname: "**.blob.vercel-storage.com",
            },
            {
              protocol: "https" as const,
              hostname: "lh3.googleusercontent.com",
            },
          ]),
    ],
  },
  // Avoid incorrect workspace root inference when multiple lockfiles exist
  // This ensures .next artifacts are generated under this project folder
  turbopack: {
    root: __dirname,
  },
  // Redirects for old URLs after route restructuring
  async redirects() {
    return [
      {
        source: "/book",
        destination: "/home",
        permanent: true,
      },
      {
        source: "/mybooking",
        destination: "/account/bookings",
        permanent: true,
      },
      {
        source: "/charters/view",
        destination: "/search",
        permanent: true,
      },
      {
        source: "/charters/view/:id",
        destination: "/charters/:id",
        permanent: true,
      },
      // Booking system redirects
      {
        source: "/checkout",
        destination: "/home",
        permanent: true,
      },
      {
        source: "/checkout/confirmation",
        destination: "/book/confirm",
        permanent: true,
      },
      {
        source: "/pay/:id",
        destination: "/book/payment/:id",
        permanent: true,
      },
      {
        source: "/booking/:id",
        destination: "/book/confirm",
        permanent: true,
      },
      // Old account booking detail route (deprecated 2025-10-28)
      {
        source: "/account/bookings/:id",
        destination: "/book/confirm?id=:id",
        permanent: true,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
