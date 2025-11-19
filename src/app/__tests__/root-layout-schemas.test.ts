/**
 * Tests for global structured data in root layout
 * Verifies Organization and WebSite schemas are properly configured
 */

import {
  createOrganizationSchema,
  createWebSiteSchema,
  serializeSchema,
} from "@/lib/seo";
import { SITE_CONFIG } from "@/lib/seo/constants";
import { describe, expect, it } from "vitest";

describe("Root Layout - Global Structured Data", () => {
  describe("Organization Schema", () => {
    const orgSchema = createOrganizationSchema();

    it("should have correct @context and @type", () => {
      expect(orgSchema["@context"]).toBe("https://schema.org");
      expect(orgSchema["@type"]).toBe("Organization");
    });

    it("should include site configuration", () => {
      expect(orgSchema.name).toBe(SITE_CONFIG.name);
      expect(orgSchema.description).toBe(SITE_CONFIG.description);
      expect(orgSchema.url).toBe(SITE_CONFIG.url);
    });

    it("should include logo URL", () => {
      expect(orgSchema.logo).toBe(`${SITE_CONFIG.url}/logo.png`);
    });

    it("should include all social media profiles", () => {
      expect(orgSchema.sameAs).toBeDefined();
      expect(Array.isArray(orgSchema.sameAs)).toBe(true);

      const socialUrls = orgSchema.sameAs as string[];
      expect(socialUrls.length).toBeGreaterThan(0);

      // Check for Facebook, Instagram, TikTok
      const hasFacebook = socialUrls.some((url) =>
        url.includes("facebook.com")
      );
      const hasInstagram = socialUrls.some((url) =>
        url.includes("instagram.com")
      );
      const hasTikTok = socialUrls.some((url) => url.includes("tiktok.com"));

      expect(hasFacebook).toBe(true);
      expect(hasInstagram).toBe(true);
      expect(hasTikTok).toBe(true);
    });

    it("should include contact point", () => {
      expect(orgSchema.contactPoint).toBeDefined();
      const cp = orgSchema.contactPoint as Record<string, unknown>;

      expect(cp["@type"]).toBe("ContactPoint");
      expect(cp.telephone).toBe(SITE_CONFIG.contact.telephone);
      expect(cp.contactType).toBe(SITE_CONFIG.contact.type);
      expect(cp.email).toBe(SITE_CONFIG.contact.email);
    });

    it("should include address with Malaysia country code", () => {
      expect(orgSchema.address).toBeDefined();
      const address = orgSchema.address as Record<string, unknown>;

      expect(address["@type"]).toBe("PostalAddress");
      expect(address.addressCountry).toBe("MY");
    });

    it("should serialize to valid JSON string", () => {
      const serialized = serializeSchema(orgSchema);
      expect(typeof serialized).toBe("string");

      // Verify it's valid JSON
      const parsed = JSON.parse(serialized);
      expect(parsed["@type"]).toBe("Organization");
    });
  });

  describe("WebSite Schema", () => {
    const websiteSchema = createWebSiteSchema();

    it("should have correct @context and @type", () => {
      expect(websiteSchema["@context"]).toBe("https://schema.org");
      expect(websiteSchema["@type"]).toBe("WebSite");
    });

    it("should include site configuration", () => {
      expect(websiteSchema.name).toBe(SITE_CONFIG.name);
      expect(websiteSchema.description).toBe(SITE_CONFIG.description);
      expect(websiteSchema.url).toBe(SITE_CONFIG.url);
    });

    it("should include search action for sitelinks searchbox", () => {
      expect(websiteSchema.potentialAction).toBeDefined();
      const action = websiteSchema.potentialAction as Record<string, unknown>;

      expect(action["@type"]).toBe("SearchAction");
      expect(action.query_input).toBe("required name=search_term_string");
    });

    it("should have correct search URL template", () => {
      const action = websiteSchema.potentialAction as Record<string, unknown>;
      const target = action.target as Record<string, unknown>;

      expect(target["@type"]).toBe("EntryPoint");
      expect(target.urlTemplate).toBe(
        `${SITE_CONFIG.url}/search?q={search_term_string}`
      );
    });

    it("should serialize to valid JSON string", () => {
      const serialized = serializeSchema(websiteSchema);
      expect(typeof serialized).toBe("string");

      // Verify it's valid JSON
      const parsed = JSON.parse(serialized);
      expect(parsed["@type"]).toBe("WebSite");
    });
  });

  describe("Schema Integration", () => {
    it("should create both schemas without conflicts", () => {
      const orgSchema = createOrganizationSchema();
      const websiteSchema = createWebSiteSchema();

      // Both should have schema.org context
      expect(orgSchema["@context"]).toBe("https://schema.org");
      expect(websiteSchema["@context"]).toBe("https://schema.org");

      // They should have different types
      expect(orgSchema["@type"]).not.toBe(websiteSchema["@type"]);
    });

    it("should both reference the same site URL", () => {
      const orgSchema = createOrganizationSchema();
      const websiteSchema = createWebSiteSchema();

      expect(orgSchema.url).toBe(websiteSchema.url);
      expect(orgSchema.url).toBe(SITE_CONFIG.url);
    });

    it("should serialize both schemas independently", () => {
      const orgSchema = createOrganizationSchema();
      const websiteSchema = createWebSiteSchema();

      const serializedOrg = serializeSchema(orgSchema);
      const serializedWebsite = serializeSchema(websiteSchema);

      // Verify both are valid JSON
      const parsedOrg = JSON.parse(serializedOrg);
      const parsedWebsite = JSON.parse(serializedWebsite);

      expect(parsedOrg["@type"]).toBe("Organization");
      expect(parsedWebsite["@type"]).toBe("WebSite");
    });
  });

  describe("SEO Best Practices", () => {
    it("Organization schema should include all required properties", () => {
      const orgSchema = createOrganizationSchema();

      const requiredProps = [
        "@context",
        "@type",
        "name",
        "url",
        "logo",
        "sameAs",
        "contactPoint",
      ];

      requiredProps.forEach((prop) => {
        expect(orgSchema[prop as keyof typeof orgSchema]).toBeDefined();
      });
    });

    it("WebSite schema should include all required properties", () => {
      const websiteSchema = createWebSiteSchema();

      const requiredProps = [
        "@context",
        "@type",
        "name",
        "url",
        "potentialAction",
      ];

      requiredProps.forEach((prop) => {
        expect(websiteSchema[prop as keyof typeof websiteSchema]).toBeDefined();
      });
    });

    it("should use HTTPS URLs for all external references", () => {
      const orgSchema = createOrganizationSchema();
      const websiteSchema = createWebSiteSchema();

      expect(orgSchema.url).toMatch(/^https:\/\//);
      expect(websiteSchema.url).toMatch(/^https:\/\//);
      expect(orgSchema.logo).toMatch(/^https:\/\//);

      const socialUrls = orgSchema.sameAs as string[];
      socialUrls.forEach((url) => {
        expect(url).toMatch(/^https:\/\//);
      });
    });

    it("should have consistent branding across schemas", () => {
      const orgSchema = createOrganizationSchema();
      const websiteSchema = createWebSiteSchema();

      expect(orgSchema.name).toBe(websiteSchema.name);
      expect(orgSchema.description).toBe(websiteSchema.description);
    });
  });
});
