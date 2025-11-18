import { describe, expect, it, vi } from "vitest";

// Mock the interactive components to prevent React JSX errors in test environment
vi.mock("../about/page", async () => {
  const actual = await vi.importActual("../about/page");
  return actual;
});
vi.mock("../terms/TermsInteractive", () => ({
  default: () => null,
}));
vi.mock("../privacy/PrivacyInteractive", () => ({
  default: () => null,
}));
vi.mock("../refund-policy/RefundPolicyInteractive", () => ({
  default: () => null,
}));

import { metadata as aboutMetadata } from "../about/page";
import { metadata as privacyMetadata } from "../privacy/page";
import { metadata as refundMetadata } from "../refund-policy/page";
import { metadata as termsMetadata } from "../terms/page";

describe("Marketing Pages - Metadata", () => {
  describe("About Page", () => {
    it("should have proper title", () => {
      expect(aboutMetadata.title).toBeTruthy();
      expect(String(aboutMetadata.title)).toContain("About");
    });

    it("should have description", () => {
      expect(aboutMetadata.description).toBeTruthy();
      expect(aboutMetadata.description?.length).toBeGreaterThan(0);
    });

    it("should allow indexing", () => {
      expect(aboutMetadata.robots).not.toEqual({ index: false });
    });

    it("should have canonical URL", () => {
      expect(aboutMetadata.alternates?.canonical).toBeTruthy();
      expect(String(aboutMetadata.alternates?.canonical)).toContain("/about");
    });

    it("should have OpenGraph metadata", () => {
      expect(aboutMetadata.openGraph).toBeTruthy();
      expect(aboutMetadata.openGraph?.title).toBeTruthy();
      expect(aboutMetadata.openGraph?.description).toBeTruthy();
      expect(aboutMetadata.openGraph?.url).toBeTruthy();
    });

    it("should have Twitter metadata", () => {
      expect(aboutMetadata.twitter).toBeTruthy();
      expect(aboutMetadata.twitter?.title).toBeTruthy();
      expect(aboutMetadata.twitter?.description).toBeTruthy();
    });
  });

  describe("Terms Page", () => {
    it("should have proper title", () => {
      expect(termsMetadata.title).toBeTruthy();
      expect(String(termsMetadata.title)).toContain("Terms");
    });

    it("should have comprehensive description", () => {
      expect(termsMetadata.description).toBeTruthy();
      const desc = termsMetadata.description || "";
      expect(desc.length).toBeGreaterThan(30);
    });

    it("should allow indexing", () => {
      expect(termsMetadata.robots).not.toEqual({ index: false });
    });

    it("should have canonical URL", () => {
      expect(termsMetadata.alternates?.canonical).toBeTruthy();
      expect(String(termsMetadata.alternates?.canonical)).toContain("/terms");
    });

    it("should have OpenGraph metadata", () => {
      expect(termsMetadata.openGraph).toBeTruthy();
      expect(termsMetadata.openGraph?.title).toBeTruthy();
      expect(termsMetadata.openGraph?.description).toBeTruthy();
      expect(termsMetadata.openGraph?.url).toBeTruthy();
    });

    it("should have Twitter metadata", () => {
      expect(termsMetadata.twitter).toBeTruthy();
      expect(termsMetadata.twitter?.title).toBeTruthy();
      expect(termsMetadata.twitter?.description).toBeTruthy();
    });

    it("should include relevant keywords", () => {
      expect(termsMetadata.keywords).toBeTruthy();
      const keywords = Array.isArray(termsMetadata.keywords)
        ? termsMetadata.keywords
        : [];
      expect(
        keywords.some((k) => k.toLowerCase().includes("terms"))
      ).toBeTruthy();
    });
  });

  describe("Privacy Page", () => {
    it("should have proper title", () => {
      expect(privacyMetadata.title).toBeTruthy();
      expect(String(privacyMetadata.title)).toContain("Privacy");
    });

    it("should have comprehensive description", () => {
      expect(privacyMetadata.description).toBeTruthy();
      const desc = privacyMetadata.description || "";
      expect(desc.length).toBeGreaterThan(30);
    });

    it("should allow indexing", () => {
      expect(privacyMetadata.robots).not.toEqual({ index: false });
    });

    it("should have canonical URL", () => {
      expect(privacyMetadata.alternates?.canonical).toBeTruthy();
      expect(String(privacyMetadata.alternates?.canonical)).toContain(
        "/privacy"
      );
    });

    it("should have OpenGraph metadata", () => {
      expect(privacyMetadata.openGraph).toBeTruthy();
      expect(privacyMetadata.openGraph?.title).toBeTruthy();
      expect(privacyMetadata.openGraph?.description).toBeTruthy();
      expect(privacyMetadata.openGraph?.url).toBeTruthy();
    });

    it("should have Twitter metadata", () => {
      expect(privacyMetadata.twitter).toBeTruthy();
      expect(privacyMetadata.twitter?.title).toBeTruthy();
      expect(privacyMetadata.twitter?.description).toBeTruthy();
    });

    it("should include relevant keywords", () => {
      expect(privacyMetadata.keywords).toBeTruthy();
      const keywords = Array.isArray(privacyMetadata.keywords)
        ? privacyMetadata.keywords
        : [];
      expect(
        keywords.some((k) => k.toLowerCase().includes("privacy"))
      ).toBeTruthy();
    });
  });

  describe("Refund Policy Page", () => {
    it("should have proper title", () => {
      expect(refundMetadata.title).toBeTruthy();
      expect(String(refundMetadata.title)).toContain("Refund");
    });

    it("should have comprehensive description", () => {
      expect(refundMetadata.description).toBeTruthy();
      const desc = refundMetadata.description || "";
      expect(desc.length).toBeGreaterThan(30);
    });

    it("should allow indexing", () => {
      expect(refundMetadata.robots).not.toEqual({ index: false });
    });

    it("should have canonical URL", () => {
      expect(refundMetadata.alternates?.canonical).toBeTruthy();
      expect(String(refundMetadata.alternates?.canonical)).toContain("/refund");
    });

    it("should have OpenGraph metadata", () => {
      expect(refundMetadata.openGraph).toBeTruthy();
      expect(refundMetadata.openGraph?.title).toBeTruthy();
      expect(refundMetadata.openGraph?.description).toBeTruthy();
      expect(refundMetadata.openGraph?.url).toBeTruthy();
    });

    it("should have Twitter metadata", () => {
      expect(refundMetadata.twitter).toBeTruthy();
      expect(refundMetadata.twitter?.title).toBeTruthy();
      expect(refundMetadata.twitter?.description).toBeTruthy();
    });

    it("should include relevant keywords", () => {
      expect(refundMetadata.keywords).toBeTruthy();
      const keywords = Array.isArray(refundMetadata.keywords)
        ? refundMetadata.keywords
        : [];
      expect(
        keywords.some((k) => k.toLowerCase().includes("refund"))
      ).toBeTruthy();
    });
  });
});
