/**
 * Global SEO and site configuration constants
 */

import type { SiteConfig } from "./types";

/**
 * Main site configuration used throughout the application for SEO and structured data
 */
export const SITE_CONFIG: SiteConfig = {
  url: "https://www.fishon.my",
  name: "Fishon.my",
  description: "Malaysia's #1 fishing charter booking platform",
  locale: "ms_MY",
  contact: {
    type: "Customer Service",
    telephone: "+60",
    email: "support@fishon.my",
    url: "https://www.fishon.my/contact",
  },
  social: {
    facebook: "https://www.facebook.com/profile.php?id=61580228252347",
    instagram:
      "https://www.instagram.com/fishon.my?utm_source=qr&igsh=ajltamRvZHI0ZzB4",
    tiktok: "https://www.tiktok.com/@fishon.my?_r=1&_t=ZS-91Au8zrjbLW",
  },
  ogImage: {
    url: "https://www.fishon.my/og-image.jpg",
    width: 1200,
    height: 630,
  },
};

/**
 * Default robots directives for public pages
 */
export const DEFAULT_ROBOTS = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large" as const,
    "max-video-preview": -1,
  },
} as const;

/**
 * Default OpenGraph image settings
 */
export const DEFAULT_OG_IMAGE = {
  url: `${SITE_CONFIG.url}/og-image.jpg`,
  width: 1200,
  height: 630,
};

/**
 * Default Twitter Card settings
 */
export const DEFAULT_TWITTER_CARD = "summary_large_image";

/**
 * Common keywords for the entire site
 */
export const SITE_KEYWORDS = [
  "fishing charter",
  "charter booking",
  "Malaysia",
  "fishon",
  "fishing tours",
  "boat rental",
];
