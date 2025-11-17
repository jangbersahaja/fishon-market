/**
 * SEO and Structured Data Type Definitions
 */

/**
 * Configuration for generating page-level metadata
 */
export interface PageMetadataConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  ogUrl?: string;
  ogType?: "website" | "article" | "profile" | "business.business";
  twitterHandle?: string;
  robots?:
    | "index,follow"
    | "noindex,follow"
    | "index,nofollow"
    | "noindex,nofollow";
  alternates?: {
    canonical?: string;
    languages?: Record<string, string>;
  };
}

/**
 * Configuration for JSON-LD structured data
 */
export interface StructuredDataConfig {
  [key: string]: unknown;
}

/**
 * Global site configuration
 */
export interface SiteConfig {
  url: string;
  name: string;
  description: string;
  locale: string;
  contact: ContactPoint;
  social: SocialProfiles;
  ogImage?: {
    url: string;
    width: number;
    height: number;
  };
}

/**
 * Contact point for organization schema
 */
export interface ContactPoint {
  type: "Customer Service" | "Technical Support" | "Sales" | "General";
  telephone: string;
  email?: string;
  url?: string;
}

/**
 * Social media profiles
 */
export interface SocialProfiles {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  youtube?: string;
  linkedin?: string;
}

/**
 * FAQ item for FAQ schema
 */
export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  name: string;
  url: string;
  position: number;
}

/**
 * JSON-LD base structure
 */
export interface JSONLDBase {
  "@context": string;
  "@type": string;
  [key: string]: unknown;
}
