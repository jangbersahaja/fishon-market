import { describe, expect, it } from "vitest";
import { isHeicFile } from "../heicConverter";

describe("heicConverter", () => {
  describe("isHeicFile", () => {
    it("should detect HEIC files by extension", () => {
      const file = new File([], "photo.heic", { type: "image/heic" });
      expect(isHeicFile(file)).toBe(true);
    });

    it("should detect HEIF files by extension", () => {
      const file = new File([], "photo.heif", { type: "image/heif" });
      expect(isHeicFile(file)).toBe(true);
    });

    it("should detect HEIC files by MIME type", () => {
      const file = new File([], "photo.jpg", { type: "image/heic" });
      expect(isHeicFile(file)).toBe(true);
    });

    it("should detect HEIF files by MIME type", () => {
      const file = new File([], "photo.jpg", { type: "image/heif" });
      expect(isHeicFile(file)).toBe(true);
    });

    it("should handle uppercase extensions", () => {
      const file = new File([], "photo.HEIC", { type: "image/jpeg" });
      expect(isHeicFile(file)).toBe(true);
    });

    it("should handle uppercase MIME types", () => {
      const file = new File([], "photo.jpg", { type: "IMAGE/HEIC" });
      expect(isHeicFile(file)).toBe(true);
    });

    it("should not detect regular JPEG files", () => {
      const file = new File([], "photo.jpg", { type: "image/jpeg" });
      expect(isHeicFile(file)).toBe(false);
    });

    it("should not detect PNG files", () => {
      const file = new File([], "photo.png", { type: "image/png" });
      expect(isHeicFile(file)).toBe(false);
    });

    it("should not detect WebP files", () => {
      const file = new File([], "photo.webp", { type: "image/webp" });
      expect(isHeicFile(file)).toBe(false);
    });
  });
});
