/**
 * JSON-LD Schema builders for structured data
 * Generates valid JSON-LD markup for search engine optimization
 */

import { SITE_CONFIG } from "./constants";
import type {
  BreadcrumbItem,
  FAQItem,
  JSONLDBase,
  SocialProfiles,
} from "./types";

/**
 * Create Organization schema with social profiles
 * Use this to define your organization for search engines
 *
 * @example
 * ```ts
 * const orgSchema = createOrganizationSchema({
 *   facebook: "https://facebook.com/...",
 *   instagram: "https://instagram.com/...",
 * });
 * ```
 *
 * @param socialProfiles - Social media profiles
 * @returns JSON-LD Organization schema
 */
export function createOrganizationSchema(
  socialProfiles?: Partial<SocialProfiles>
): JSONLDBase {
  const profiles = socialProfiles || SITE_CONFIG.social;

  const sameAsUrls = Object.values(profiles).filter(
    (url): url is string => typeof url === "string"
  );

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/logo.png`,
    sameAs: sameAsUrls,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE_CONFIG.contact.telephone,
      contactType: SITE_CONFIG.contact.type,
      email: SITE_CONFIG.contact.email,
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "MY",
    },
  };
}

/**
 * Create WebSite schema with search action
 * Enables search box features in Google Search results
 *
 * @example
 * ```ts
 * const websiteSchema = createWebSiteSchema();
 * ```
 *
 * @returns JSON-LD WebSite schema
 */
export function createWebSiteSchema(): JSONLDBase {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_CONFIG.url}/search?q={search_term_string}`,
      },
      query_input: "required name=search_term_string",
    },
  };
}

/**
 * Create ContactPoint schema
 * Use this to specify how users can contact your organization
 *
 * @example
 * ```ts
 * const contactSchema = createContactPointSchema("Customer Service", "+60123456789");
 * ```
 *
 * @param contactType - Type of contact point
 * @param telephone - Phone number
 * @param email - Email address
 * @returns JSON-LD ContactPoint schema
 */
export function createContactPointSchema(
  contactType:
    | "Customer Service"
    | "Technical Support"
    | "Sales"
    | "General" = "General",
  telephone: string = SITE_CONFIG.contact.telephone,
  email?: string
): JSONLDBase {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPoint",
    contactType,
    telephone,
    email: email || SITE_CONFIG.contact.email,
    areaServed: "MY",
    availableLanguage: ["en", "ms"],
  };
}

/**
 * Create FAQPage schema with Q&A pairs
 * Displays FAQ snippets in Google Search results
 *
 * @example
 * ```ts
 * const faqSchema = createFAQPageSchema([
 *   { question: "How do I book?", answer: "Click the book button..." },
 *   { question: "What is included?", answer: "Everything is included..." },
 * ]);
 * ```
 *
 * @param faqs - Array of FAQ items
 * @returns JSON-LD FAQPage schema
 */
export function createFAQPageSchema(faqs: FAQItem[]): JSONLDBase {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Create BreadcrumbList schema
 * Improves navigation display in search results
 *
 * @example
 * ```ts
 * const breadcrumbSchema = createBreadcrumbSchema([
 *   { name: "Home", url: "https://fishon.my", position: 1 },
 *   { name: "Charters", url: "https://fishon.my/charters", position: 2 },
 *   { name: "Details", url: "https://fishon.my/charters/123", position: 3 },
 * ]);
 * ```
 *
 * @param items - Array of breadcrumb items
 * @returns JSON-LD BreadcrumbList schema
 */
export function createBreadcrumbSchema(items: BreadcrumbItem[]): JSONLDBase {
  const itemListElement = items.map((item) => ({
    "@type": "ListItem",
    position: item.position,
    name: item.name,
    item: item.url,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
}

/**
 * Create a LocalBusiness schema
 * Defines your fishing charter business for local search
 *
 * @example
 * ```ts
 * const businessSchema = createLocalBusinessSchema({
 *   name: "Fishon Charter Co",
 *   telephone: "+60123456789",
 * });
 * ```
 *
 * @param config - Business configuration
 * @returns JSON-LD LocalBusiness schema
 */
export function createLocalBusinessSchema(config: {
  name: string;
  description?: string;
  telephone?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
  };
  image?: string;
  priceRange?: string;
}): JSONLDBase {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: config.name,
    description: config.description || SITE_CONFIG.description,
    url: SITE_CONFIG.url,
    telephone: config.telephone || SITE_CONFIG.contact.telephone,
    image: config.image || `${SITE_CONFIG.url}/og-image.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: config.address?.streetAddress || "",
      addressLocality: config.address?.addressLocality || "",
      addressRegion: config.address?.addressRegion || "",
      postalCode: config.address?.postalCode || "",
      addressCountry: "MY",
    },
    priceRange: config.priceRange,
    geo: {
      "@type": "GeoShape",
      addressCountry: "MY",
    },
  };
}

/**
 * Serialize JSON-LD schema to script tag string
 * Use this when you need to inject the schema as a script tag
 *
 * @example
 * ```tsx
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{
 *     __html: serializeSchema(createOrganizationSchema()),
 *   }}
 * />
 * ```
 *
 * @param schema - JSON-LD schema object
 * @returns JSON string ready for script tag
 */
export function serializeSchema(schema: Record<string, unknown>): string {
  return JSON.stringify(schema);
}
