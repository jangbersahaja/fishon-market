/**
 * SEO Utilities Library
 * Exports all metadata and structured data functions for use across the application
 */

// Metadata utilities
export {
  createArticleMetadata,
  createHomeMetadata,
  createMetadata,
  createPageMetadata,
} from "./metadata";

// Structured data builders
export {
  createBreadcrumbSchema,
  createContactPointSchema,
  createFAQPageSchema,
  createLocalBusinessSchema,
  createOrganizationSchema,
  createWebSiteSchema,
  serializeSchema,
} from "./structured-data";

// Types
export type {
  BreadcrumbItem,
  ContactPoint,
  FAQItem,
  JSONLDBase,
  PageMetadataConfig,
  SiteConfig,
  SocialProfiles,
  StructuredDataConfig,
} from "./types";

// Constants
export {
  DEFAULT_OG_IMAGE,
  DEFAULT_ROBOTS,
  DEFAULT_TWITTER_CARD,
  SITE_CONFIG,
  SITE_KEYWORDS,
} from "./constants";
