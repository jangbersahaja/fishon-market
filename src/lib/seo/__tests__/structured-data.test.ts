/**
 * Tests for JSON-LD structured data builders
 */

import { describe, expect, it } from "vitest";
import { SITE_CONFIG } from "../constants";
import {
  createBreadcrumbSchema,
  createContactPointSchema,
  createFAQPageSchema,
  createLocalBusinessSchema,
  createOrganizationSchema,
  createWebSiteSchema,
  serializeSchema,
} from "../structured-data";

describe("JSON-LD Structured Data Builders", () => {
  describe("createOrganizationSchema", () => {
    it("should create valid Organization schema", () => {
      const schema = createOrganizationSchema();

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("Organization");
      expect(schema.name).toBe(SITE_CONFIG.name);
      expect(schema.description).toBe(SITE_CONFIG.description);
      expect(schema.url).toBe(SITE_CONFIG.url);
    });

    it("should include organization name and description", () => {
      const schema = createOrganizationSchema();

      expect(schema.name).toBe("Fishon.my");
      expect(schema.description).toContain("fishing charter");
    });

    it("should include logo URL", () => {
      const schema = createOrganizationSchema();

      expect(schema.logo).toBe(`${SITE_CONFIG.url}/logo.png`);
    });

    it("should include sameAs social profiles", () => {
      const schema = createOrganizationSchema();

      expect(schema.sameAs).toBeDefined();
      expect(Array.isArray(schema.sameAs)).toBe(true);
      expect((schema.sameAs as string[]).length).toBeGreaterThan(0);
    });

    it("should include contactPoint information", () => {
      const schema = createOrganizationSchema();

      const contactPoint = schema.contactPoint as Record<string, unknown>;
      expect(contactPoint["@type"]).toBe("ContactPoint");
      expect(contactPoint.telephone).toBeDefined();
      expect(contactPoint.email).toBeDefined();
    });

    it("should accept custom social profiles", () => {
      const customProfiles = {
        facebook: "https://facebook.com/custom",
        twitter: "https://twitter.com/custom",
      };

      const schema = createOrganizationSchema(customProfiles);

      expect(
        (schema.sameAs as string[]).some((url) =>
          url.includes("facebook.com/custom")
        )
      ).toBe(true);
      expect(
        (schema.sameAs as string[]).some((url) =>
          url.includes("twitter.com/custom")
        )
      ).toBe(true);
    });

    it("should include address with Malaysia country code", () => {
      const schema = createOrganizationSchema();

      const address = schema.address as Record<string, unknown>;
      expect(address["@type"]).toBe("PostalAddress");
      expect(address.addressCountry).toBe("MY");
    });
  });

  describe("createWebSiteSchema", () => {
    it("should create valid WebSite schema", () => {
      const schema = createWebSiteSchema();

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("WebSite");
      expect(schema.name).toBe(SITE_CONFIG.name);
    });

    it("should include site name and description", () => {
      const schema = createWebSiteSchema();

      expect(schema.name).toBe(SITE_CONFIG.name);
      expect(schema.description).toBe(SITE_CONFIG.description);
      expect(schema.url).toBe(SITE_CONFIG.url);
    });

    it("should include SearchAction potentialAction", () => {
      const schema = createWebSiteSchema();

      const potentialAction = schema.potentialAction as Record<string, unknown>;
      expect(potentialAction["@type"]).toBe("SearchAction");
    });

    it("should have correct search URL template", () => {
      const schema = createWebSiteSchema();

      const searchAction = schema.potentialAction as {
        target?: { urlTemplate?: string };
      };
      expect(searchAction.target?.urlTemplate).toContain(
        "/search?q={search_term_string}"
      );
      expect(searchAction.target?.urlTemplate).toContain(SITE_CONFIG.url);
    });

    it("should include query_input specification", () => {
      const schema = createWebSiteSchema();

      const searchAction = schema.potentialAction as { query_input?: string };
      expect(searchAction.query_input).toBe("required name=search_term_string");
    });
  });

  describe("createContactPointSchema", () => {
    it("should create valid ContactPoint schema", () => {
      const schema = createContactPointSchema();

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("ContactPoint");
    });

    it("should use provided contact type", () => {
      const schema = createContactPointSchema("Sales");

      expect(schema.contactType).toBe("Sales");
    });

    it("should default to Customer Service when not provided", () => {
      const schema = createContactPointSchema();

      expect(schema.contactType).toBe("General");
    });

    it("should include telephone and email", () => {
      const schema = createContactPointSchema(
        "Technical Support",
        "+60123456789",
        "tech@fishon.my"
      );

      expect(schema.telephone).toBe("+60123456789");
      expect(schema.email).toBe("tech@fishon.my");
    });

    it("should set areaServed to Malaysia", () => {
      const schema = createContactPointSchema();

      expect(schema.areaServed).toBe("MY");
    });

    it("should include available languages", () => {
      const schema = createContactPointSchema();

      expect(schema.availableLanguage).toContain("en");
      expect(schema.availableLanguage).toContain("ms");
    });
  });

  describe("createFAQPageSchema", () => {
    it("should create valid FAQPage schema", () => {
      const faqs = [
        { question: "Q1?", answer: "A1" },
        { question: "Q2?", answer: "A2" },
      ];

      const schema = createFAQPageSchema(faqs);

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("FAQPage");
    });

    it("should convert FAQ items to Q&A structure", () => {
      const faqs = [
        { question: "How to book?", answer: "Visit the website..." },
        { question: "What is included?", answer: "Everything..." },
      ];

      const schema = createFAQPageSchema(faqs);
      const mainEntity = schema.mainEntity as unknown[];

      expect(mainEntity).toHaveLength(2);
      expect(mainEntity[0]).toMatchObject({
        "@type": "Question",
        name: "How to book?",
      });
    });

    it("should create acceptedAnswer structure", () => {
      const faqs = [{ question: "Q?", answer: "Answer text" }];

      const schema = createFAQPageSchema(faqs);
      const mainEntity = schema.mainEntity as Array<Record<string, unknown>>;

      expect(mainEntity[0].acceptedAnswer).toBeDefined();
      const acceptedAnswer = mainEntity[0].acceptedAnswer as Record<
        string,
        unknown
      >;
      expect(acceptedAnswer["@type"]).toBe("Answer");
      expect(acceptedAnswer.text).toBe("Answer text");
    });

    it("should handle empty FAQ array", () => {
      const schema = createFAQPageSchema([]);

      const mainEntity = schema.mainEntity as unknown[];
      expect(mainEntity).toHaveLength(0);
    });

    it("should preserve question and answer text", () => {
      const faqs = [
        {
          question: "What payment methods do you accept?",
          answer: "We accept credit cards, debit cards, and bank transfers.",
        },
      ];

      const schema = createFAQPageSchema(faqs);
      const mainEntity = schema.mainEntity as Array<{
        name?: string;
        acceptedAnswer?: { text?: string };
      }>;

      expect(mainEntity[0].name).toBe("What payment methods do you accept?");
      expect(mainEntity[0].acceptedAnswer?.text).toBe(
        "We accept credit cards, debit cards, and bank transfers."
      );
    });
  });

  describe("createBreadcrumbSchema", () => {
    it("should create valid BreadcrumbList schema", () => {
      const items = [{ name: "Home", url: "https://fishon.my", position: 1 }];

      const schema = createBreadcrumbSchema(items);

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("BreadcrumbList");
    });

    it("should convert breadcrumb items to itemListElement", () => {
      const items = [
        { name: "Home", url: "https://fishon.my", position: 1 },
        { name: "Charters", url: "https://fishon.my/charters", position: 2 },
        { name: "Details", url: "https://fishon.my/charters/123", position: 3 },
      ];

      const schema = createBreadcrumbSchema(items);
      const itemList = schema.itemListElement as Array<{
        position?: number;
        name?: string;
      }>;

      expect(itemList).toHaveLength(3);
      expect(itemList[0]).toMatchObject({
        position: 1,
        name: "Home",
      });
      expect(itemList[2]).toMatchObject({
        position: 3,
        name: "Details",
      });
    });

    it("should set item property correctly", () => {
      const items = [
        { name: "Test", url: "https://fishon.my/test", position: 1 },
      ];

      const schema = createBreadcrumbSchema(items);
      const itemList = schema.itemListElement as Array<{ item?: string }>;

      expect(itemList[0].item).toBe("https://fishon.my/test");
    });

    it("should handle deep breadcrumb paths", () => {
      const items = [
        { name: "Home", url: "https://fishon.my", position: 1 },
        { name: "Charters", url: "https://fishon.my/charters", position: 2 },
        {
          name: "Search",
          url: "https://fishon.my/charters/search",
          position: 3,
        },
        { name: "Details", url: "https://fishon.my/charters/123", position: 4 },
      ];

      const schema = createBreadcrumbSchema(items);
      const itemList = schema.itemListElement as unknown[];

      expect(itemList).toHaveLength(4);
    });
  });

  describe("createLocalBusinessSchema", () => {
    it("should create valid LocalBusiness schema", () => {
      const schema = createLocalBusinessSchema({
        name: "Fishon Charter Co",
      });

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("LocalBusiness");
      expect(schema.name).toBe("Fishon Charter Co");
    });

    it("should include business information", () => {
      const schema = createLocalBusinessSchema({
        name: "Test Charter",
        telephone: "+60123456789",
        priceRange: "$$$",
      });

      expect(schema.name).toBe("Test Charter");
      expect(schema.telephone).toBe("+60123456789");
      expect(schema.priceRange).toBe("$$$");
    });

    it("should include address information", () => {
      const schema = createLocalBusinessSchema({
        name: "Test",
        address: {
          streetAddress: "123 Marina St",
          addressLocality: "Kuala Lumpur",
          addressRegion: "KL",
          postalCode: "50050",
        },
      });

      const address = schema.address as Record<string, unknown>;
      expect(address["streetAddress"]).toBe("123 Marina St");
      expect(address["addressCountry"]).toBe("MY");
    });

    it("should use site defaults for missing values", () => {
      const schema = createLocalBusinessSchema({
        name: "Test",
      });

      expect(schema.url).toBe(SITE_CONFIG.url);
      expect(schema.description).toBe(SITE_CONFIG.description);
      expect(schema.telephone).toBe(SITE_CONFIG.contact.telephone);
    });

    it("should include geo shape for Malaysia", () => {
      const schema = createLocalBusinessSchema({
        name: "Test",
      });

      const geo = schema.geo as Record<string, unknown>;
      expect(geo["@type"]).toBe("GeoShape");
      expect(geo["addressCountry"]).toBe("MY");
    });
  });

  describe("serializeSchema", () => {
    it("should convert schema to JSON string", () => {
      const schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Test",
      };

      const serialized = serializeSchema(schema);

      expect(typeof serialized).toBe("string");
      expect(serialized).toContain("@context");
      expect(serialized).toContain("Organization");
    });

    it("should produce valid JSON", () => {
      const schema = createOrganizationSchema();
      const serialized = serializeSchema(schema);

      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it("should preserve nested structures", () => {
      const schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+60123456789",
        },
      };

      const serialized = serializeSchema(schema);
      const parsed = JSON.parse(serialized);

      expect(parsed.contactPoint["@type"]).toBe("ContactPoint");
      expect(parsed.contactPoint.telephone).toBe("+60123456789");
    });
  });
});
