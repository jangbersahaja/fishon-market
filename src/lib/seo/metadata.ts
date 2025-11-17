/**
 * Metadata generation utilities for Next.js 15
 * Provides a reusable helper to create consistent metadata across all pages
 */

import type { Metadata } from "next";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_ROBOTS,
  DEFAULT_TWITTER_CARD,
  SITE_CONFIG,
  SITE_KEYWORDS,
} from "./constants";
import type { PageMetadataConfig } from "./types";

/**
 * Create Next.js Metadata object from configuration
 *
 * @example
 * ```ts
 * export const metadata = createMetadata({
 *   title: "About Us",
 *   description: "Learn about Fishon",
 *   keywords: ["about", "fishon"],
 *   ogImage: { url: "/about-og.jpg" }
 * });
 * ```
 *
 * @param config - Page metadata configuration
 * @returns Next.js 15 Metadata object
 */
export function createMetadata(config: PageMetadataConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    canonicalUrl,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    ogType = "website",
    twitterHandle,
    robots,
    alternates,
  } = config;

  const fullTitle = title ? `${title} — ${SITE_CONFIG.name}` : SITE_CONFIG.name;
  const fullDescription = description || SITE_CONFIG.description;
  const mergedKeywords = [...SITE_KEYWORDS, ...keywords];

  // Build OpenGraph images array
  const ogImages = ogImage
    ? [
        {
          url: ogImage.url,
          width: ogImage.width || DEFAULT_OG_IMAGE.width,
          height: ogImage.height || DEFAULT_OG_IMAGE.height,
          alt: ogImage.alt || SITE_CONFIG.name,
        },
      ]
    : [
        {
          url: DEFAULT_OG_IMAGE.url,
          width: DEFAULT_OG_IMAGE.width,
          height: DEFAULT_OG_IMAGE.height,
          alt: SITE_CONFIG.name,
        },
      ];

  // Map ogType to valid Next.js types
  let normalizedType: "website" | "article" | "profile" = "website";
  if (ogType === "article") {
    normalizedType = "article";
  } else if (ogType === "profile") {
    normalizedType = "profile";
  } else if (ogType === "business.business") {
    normalizedType = "website";
  }

  return {
    title: fullTitle,
    description: fullDescription,
    keywords: mergedKeywords.length > 0 ? mergedKeywords : undefined,
    robots: robots || DEFAULT_ROBOTS,
    openGraph: {
      title: ogTitle || fullTitle,
      description: ogDescription || fullDescription,
      url: ogUrl || canonicalUrl || SITE_CONFIG.url,
      siteName: SITE_CONFIG.name,
      locale: SITE_CONFIG.locale,
      type: normalizedType,
      images: ogImages,
    } as never, // Type assertion needed due to Next.js OpenGraph type strictness with multiple type unions
    twitter: {
      card: DEFAULT_TWITTER_CARD,
      title: ogTitle || fullTitle,
      description: ogDescription || fullDescription,
      creator: twitterHandle,
      images: ogImage ? [ogImage.url] : [DEFAULT_OG_IMAGE.url],
    },
    alternates: alternates || {
      canonical: canonicalUrl || `${SITE_CONFIG.url}`,
    },
    metadataBase: new URL(SITE_CONFIG.url),
  };
}

/**
 * Create metadata for a home/index page
 */
export function createHomeMetadata(): Metadata {
  return createMetadata({
    title: undefined,
    description: SITE_CONFIG.description,
    keywords: ["fishing charter Malaysia", "book fishing tour"],
    ogType: "website",
  });
}

/**
 * Create metadata for a static page (About, Terms, etc.)
 */
export function createPageMetadata(
  pageName: string,
  description: string,
  keywords?: string[]
): Metadata {
  return createMetadata({
    title: pageName,
    description,
    keywords,
    ogType: "website",
  });
}

/**
 * Create metadata for an article/blog post
 */
export function createArticleMetadata(
  title: string,
  description: string,
  author?: string,
  publishedDate?: Date,
  keywords?: string[]
): Metadata {
  return createMetadata({
    title,
    description,
    keywords,
    ogType: "article",
  });
}
