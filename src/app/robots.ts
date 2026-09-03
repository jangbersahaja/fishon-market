import type { MetadataRoute } from "next";

const BASE_URL = "https://www.fishon.my";

export default function robots(): MetadataRoute.Robots {
  return {
    sitemap: `${BASE_URL}/sitemap.xml`,
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/dev/",
        "/*/account/",
        "/*/book/",
        "/*/find-booking/",
        "/*/login/",
        "/*/register/",
        "/*/forgot-password/",
      ],
    },
  };
}
