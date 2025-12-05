/**
 * Tests for metadata generation utilities
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_ROBOTS, SITE_CONFIG } from "../constants";
import {
  createArticleMetadata,
  createHomeMetadata,
  createMetadata,
  createPageMetadata,
} from "../metadata";

describe("SEO Metadata Utilities", () => {
  describe("createMetadata", () => {
    it("should create metadata with minimal configuration", () => {
      const metadata = createMetadata({
        title: "Test Page",
        description: "Test description",
      });

      expect(metadata.title).toBe(`Test Page — ${SITE_CONFIG.name}`);
      expect(metadata.description).toBe("Test description");
    });

    it("should include default robots configuration", () => {
      const metadata = createMetadata({
        title: "Test",
      });

      expect(metadata.robots).toEqual(DEFAULT_ROBOTS);
    });

    it("should override robots configuration when provided", () => {
      const metadata = createMetadata({
        title: "Test",
        robots: "noindex,nofollow",
      });

      // Robots can be a string or Robots object
      expect(metadata.robots).toEqual("noindex,nofollow");
    });

    it("should merge keywords with site keywords", () => {
      const metadata = createMetadata({
        title: "Test",
        keywords: ["custom", "keywords"],
      });

      expect(metadata.keywords).toContain("custom");
      expect(metadata.keywords).toContain("keywords");
      expect(metadata.keywords).toContain("fishing charter");
    });

    it("should create OpenGraph metadata", () => {
      const metadata = createMetadata({
        title: "Test Page",
        description: "Test description",
        ogTitle: "OG Title",
        ogDescription: "OG Description",
        ogType: "article",
      });

      expect(metadata.openGraph).toBeDefined();
      expect(metadata.openGraph?.title).toBe("OG Title");
      expect(metadata.openGraph?.description).toBe("OG Description");
    });

    it("should use default OG image when not provided", () => {
      const metadata = createMetadata({
        title: "Test",
      });

      expect(metadata.openGraph?.images).toBeDefined();
      const images = Array.isArray(metadata.openGraph?.images)
        ? metadata.openGraph.images
        : [metadata.openGraph?.images];
      expect(images[0]).toEqual({
        url: `${SITE_CONFIG.url}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: SITE_CONFIG.name,
      });
    });

    it("should use custom OG image when provided", () => {
      const metadata = createMetadata({
        title: "Test",
        ogImage: {
          url: "/custom-og.jpg",
          width: 800,
          height: 400,
          alt: "Custom",
        },
      });

      const images = Array.isArray(metadata.openGraph?.images)
        ? metadata.openGraph.images
        : [metadata.openGraph?.images];
      expect(images[0]).toEqual({
        url: "/custom-og.jpg",
        width: 800,
        height: 400,
        alt: "Custom",
      });
    });

    it("should create Twitter Card metadata", () => {
      const metadata = createMetadata({
        title: "Test Page",
        description: "Test description",
        twitterHandle: "@fishon",
      });

      expect(metadata.twitter).toBeDefined();
      expect(metadata.twitter?.creator).toBe("@fishon");
      expect(metadata.twitter?.title).toBe(`Test Page — ${SITE_CONFIG.name}`);
    });

    it("should set canonical URL in alternates", () => {
      const canonicalUrl = "https://www.fishon.my/test";
      const metadata = createMetadata({
        title: "Test",
        canonicalUrl,
      });

      expect(metadata.alternates?.canonical).toBe(canonicalUrl);
    });

    it("should set metadataBase to site URL", () => {
      const metadata = createMetadata({
        title: "Test",
      });

      const metadataBase = metadata.metadataBase;
      const href =
        metadataBase instanceof URL ? metadataBase.href : metadataBase;
      expect(href).toBe(SITE_CONFIG.url + "/");
    });

    it("should handle complete configuration", () => {
      const config = {
        title: "Complete Page",
        description: "Complete description",
        keywords: ["test", "complete"],
        canonicalUrl: "https://www.fishon.my/complete",
        ogTitle: "OG Title",
        ogDescription: "OG Desc",
        ogImage: { url: "/og.jpg", width: 1200, height: 630 },
        ogUrl: "https://www.fishon.my/complete",
        ogType: "article" as const,
        twitterHandle: "@test",
        robots: "index,follow" as const,
      };

      const metadata = createMetadata(config);

      expect(metadata.title).toBe(`Complete Page — ${SITE_CONFIG.name}`);
      expect(metadata.description).toBe("Complete description");
      expect(metadata.keywords).toContain("test");
      expect(metadata.openGraph?.title).toBe("OG Title");
      expect(metadata.twitter?.creator).toBe("@test");
      expect(metadata.robots).toBe("index,follow");
    });
  });

  describe("createHomeMetadata", () => {
    it("should create home page metadata without title", () => {
      const metadata = createHomeMetadata();

      expect(metadata.title).toBe(SITE_CONFIG.name);
      expect(metadata.description).toBe(SITE_CONFIG.description);
    });

    it("should include relevant keywords for home page", () => {
      const metadata = createHomeMetadata();

      expect(metadata.keywords).toContain("fishing charter Malaysia");
      expect(metadata.keywords).toContain("book fishing tour");
    });
  });

  describe("createPageMetadata", () => {
    it("should create page metadata with correct title format", () => {
      const metadata = createPageMetadata("About Us", "Learn about Fishon");

      expect(metadata.title).toBe(`About Us — ${SITE_CONFIG.name}`);
      expect(metadata.description).toBe("Learn about Fishon");
    });

    it("should accept custom keywords", () => {
      const metadata = createPageMetadata("About", "Description", [
        "about",
        "team",
      ]);

      expect(metadata.keywords).toContain("about");
      expect(metadata.keywords).toContain("team");
    });
  });

  describe("createArticleMetadata", () => {
    it("should create article metadata", () => {
      const metadata = createArticleMetadata(
        "Article Title",
        "Article description"
      );

      expect(metadata.title).toBe(`Article Title — ${SITE_CONFIG.name}`);
      expect(metadata.description).toBe("Article description");
    });

    it("should accept optional author and date", () => {
      const date = new Date("2024-01-01");
      const metadata = createArticleMetadata(
        "Article",
        "Description",
        "John Doe",
        date
      );

      expect(metadata.title).toContain("Article");
    });

    it("should accept custom keywords", () => {
      const metadata = createArticleMetadata(
        "Article",
        "Description",
        undefined,
        undefined,
        ["fishing", "tips"]
      );

      expect(metadata.keywords).toContain("fishing");
      expect(metadata.keywords).toContain("tips");
    });
  });
});
