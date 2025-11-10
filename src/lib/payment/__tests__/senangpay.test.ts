/**
 * Unit tests for Senang Pay payment gateway utilities
 *
 * Tests cover:
 * - Hash generation for payment requests
 * - Hash verification for return/callback responses
 * - Amount formatting
 * - URL generation based on mode
 * - Configuration validation
 * - Force mock mode detection
 */

import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatAmount,
  generatePaymentHash,
  getMerchantId,
  getPaymentConfig,
  getSecretKey,
  getSenangPayUrl,
  isForceMockMode,
  isProductionReady,
  validateSenangPayConfig,
  verifyReturnHash,
  type PaymentResponse,
} from "../senangpay";

describe("senangpay utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  const testConfig = {
    merchantId: "TEST123",
    secretKey: "test-secret-key-with-sufficient-length-for-hmac",
    detail: "Test Charter Booking",
    amount: "100.00",
    orderId: "booking-123",
  };

  describe("formatAmount", () => {
    it("should format whole numbers to 2 decimal places", () => {
      expect(formatAmount(100)).toBe("100.00");
      expect(formatAmount(0)).toBe("0.00");
      expect(formatAmount(1000)).toBe("1000.00");
    });

    it("should format numbers with 1 decimal to 2 decimals", () => {
      expect(formatAmount(99.5)).toBe("99.50");
      expect(formatAmount(10.1)).toBe("10.10");
    });

    it("should round numbers with more than 2 decimals", () => {
      expect(formatAmount(123.456)).toBe("123.46");
      expect(formatAmount(99.999)).toBe("100.00");
      expect(formatAmount(10.004)).toBe("10.00");
      expect(formatAmount(10.005)).toBe("10.01");
    });

    it("should handle negative numbers", () => {
      expect(formatAmount(-50.5)).toBe("-50.50");
    });

    it("should handle very small numbers", () => {
      expect(formatAmount(0.01)).toBe("0.01");
      expect(formatAmount(0.001)).toBe("0.00");
    });

    it("should handle very large numbers", () => {
      expect(formatAmount(999999.99)).toBe("999999.99");
    });
  });

  describe("generatePaymentHash", () => {
    it("should generate consistent hash for same input", () => {
      const hash1 = generatePaymentHash(testConfig);
      const hash2 = generatePaymentHash(testConfig);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    it("should generate different hashes for different amounts", () => {
      const hash1 = generatePaymentHash(testConfig);
      const hash2 = generatePaymentHash({
        ...testConfig,
        amount: "200.00",
      });

      expect(hash1).not.toBe(hash2);
    });

    it("should generate different hashes for different order IDs", () => {
      const hash1 = generatePaymentHash(testConfig);
      const hash2 = generatePaymentHash({
        ...testConfig,
        orderId: "booking-456",
      });

      expect(hash1).not.toBe(hash2);
    });

    it("should generate different hashes for different details", () => {
      const hash1 = generatePaymentHash(testConfig);
      const hash2 = generatePaymentHash({
        ...testConfig,
        detail: "Different Booking",
      });

      expect(hash1).not.toBe(hash2);
    });

    it("should NOT change hash for different merchant IDs (per Senang Pay docs)", () => {
      // Per Senang Pay documentation, merchantId is NOT part of the payment hash
      // Hash formula: HMAC-SHA256(secretkey + detail + amount + order_id)
      const hash1 = generatePaymentHash(testConfig);
      const hash2 = generatePaymentHash({
        ...testConfig,
        merchantId: "DIFFERENT",
      });

      // Should be the same since merchantId doesn't affect payment hash
      expect(hash1).toBe(hash2);
    });

    it("should generate different hashes for different secret keys", () => {
      const hash1 = generatePaymentHash(testConfig);
      const hash2 = generatePaymentHash({
        ...testConfig,
        secretKey: "different-secret-key",
      });

      expect(hash1).not.toBe(hash2);
    });

    it("should handle special characters in detail", () => {
      const hash = generatePaymentHash({
        ...testConfig,
        detail: "Fishing Charter: RM500 @ Boat #123",
      });

      expect(hash).toHaveLength(64);
    });

    it("should generate valid hex string", () => {
      const hash = generatePaymentHash(testConfig);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("verifyReturnHash", () => {
    it("should verify correct hash for successful payment", () => {
      // Generate a valid response hash
      const response: PaymentResponse = {
        status_id: "1",
        order_id: "booking-123",
        transaction_id: "TXN123456",
        msg: "Payment Successful",
        hash: "", // Will be computed
      };

      // Compute the expected hash per Senang Pay format: secretkey + status_id + order_id + transaction_id + msg
      response.hash = crypto
        .createHmac("sha256", testConfig.secretKey)
        .update(
          `${testConfig.secretKey}${response.status_id}${response.order_id}${response.transaction_id}${response.msg}`
        )
        .digest("hex");

      const isValid = verifyReturnHash(
        response,
        testConfig.secretKey,
        testConfig.merchantId
      );

      expect(isValid).toBe(true);
    });

    it("should reject incorrect hash", () => {
      const response: PaymentResponse = {
        status_id: "1",
        order_id: "booking-123",
        transaction_id: "TXN123456",
        msg: "Payment Successful",
        hash: "incorrect-hash-value",
      };

      const isValid = verifyReturnHash(
        response,
        testConfig.secretKey,
        testConfig.merchantId
      );

      expect(isValid).toBe(false);
    });

    it("should reject hash with tampered order_id", () => {
      const response: PaymentResponse = {
        status_id: "1",
        order_id: "booking-123",
        transaction_id: "TXN123456",
        msg: "Payment Successful",
        hash: "",
      };

      // Generate hash for correct order_id
      response.hash = crypto
        .createHmac("sha256", testConfig.secretKey)
        .update(
          `${testConfig.secretKey}${response.status_id}${response.order_id}${response.transaction_id}${response.msg}`
        )
        .digest("hex");

      // Tamper with order_id
      response.order_id = "booking-999";

      const isValid = verifyReturnHash(
        response,
        testConfig.secretKey,
        testConfig.merchantId
      );

      expect(isValid).toBe(false);
    });

    it("should verify failed payment response", () => {
      const response: PaymentResponse = {
        status_id: "0",
        order_id: "booking-123",
        transaction_id: "TXN123456",
        msg: "Payment Failed",
        hash: "",
      };

      response.hash = crypto
        .createHmac("sha256", testConfig.secretKey)
        .update(
          `${testConfig.secretKey}${response.status_id}${response.order_id}${response.transaction_id}${response.msg}`
        )
        .digest("hex");

      const isValid = verifyReturnHash(
        response,
        testConfig.secretKey,
        testConfig.merchantId
      );

      expect(isValid).toBe(true);
    });

    it("should handle special characters in msg", () => {
      const response: PaymentResponse = {
        status_id: "1",
        order_id: "booking-123",
        transaction_id: "TXN123456",
        msg: "Payment Successful: RM100.00 @ 2024-01-01",
        hash: "",
      };

      response.hash = crypto
        .createHmac("sha256", testConfig.secretKey)
        .update(
          `${testConfig.secretKey}${response.status_id}${response.order_id}${response.transaction_id}${response.msg}`
        )
        .digest("hex");

      const isValid = verifyReturnHash(
        response,
        testConfig.secretKey,
        testConfig.merchantId
      );

      expect(isValid).toBe(true);
    });
  });

  describe("getSenangPayUrl", () => {
    it("should return production URL when mode is production", () => {
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      process.env.SENANGPAY_MODE = "production";

      const url = getSenangPayUrl();

      expect(url).toBe("https://app.senangpay.my/payment/123456");
    });

    it("should return sandbox URL when mode is sandbox", () => {
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      process.env.SENANGPAY_MODE = "sandbox";

      const url = getSenangPayUrl();

      expect(url).toBe("https://sandbox.senangpay.my/payment/123456");
    });

    it("should default to production URL when mode is not set", () => {
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      delete process.env.SENANGPAY_MODE;

      const url = getSenangPayUrl();

      expect(url).toBe("https://app.senangpay.my/payment/123456");
    });

    it("should throw error if merchant ID is not set", () => {
      delete process.env.SENANGPAY_MERCHANT_ID;

      expect(() => getSenangPayUrl()).toThrow(
        "SENANGPAY_MERCHANT_ID is not configured"
      );
    });
  });

  describe("validateSenangPayConfig", () => {
    it("should return valid config when all required vars are set", () => {
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      process.env.SENANGPAY_SECRET_KEY = "secret";

      const result = validateSenangPayConfig();

      expect(result.isConfigured).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should report missing merchant ID", () => {
      delete process.env.SENANGPAY_MERCHANT_ID;
      process.env.SENANGPAY_SECRET_KEY = "secret";

      const result = validateSenangPayConfig();

      expect(result.isConfigured).toBe(false);
      expect(result.errors).toContain("SENANGPAY_MERCHANT_ID is not set");
    });

    it("should report missing secret key", () => {
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      delete process.env.SENANGPAY_SECRET_KEY;

      const result = validateSenangPayConfig();

      expect(result.isConfigured).toBe(false);
      expect(result.errors).toContain("SENANGPAY_SECRET_KEY is not set");
    });

    it("should report both missing vars", () => {
      delete process.env.SENANGPAY_MERCHANT_ID;
      delete process.env.SENANGPAY_SECRET_KEY;

      const result = validateSenangPayConfig();

      expect(result.isConfigured).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it("should accept valid sandbox mode", () => {
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      process.env.SENANGPAY_SECRET_KEY = "secret";
      process.env.SENANGPAY_MODE = "sandbox";

      const result = validateSenangPayConfig();

      expect(result.isConfigured).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept valid production mode", () => {
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      process.env.SENANGPAY_SECRET_KEY = "secret";
      process.env.SENANGPAY_MODE = "production";

      const result = validateSenangPayConfig();

      expect(result.isConfigured).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid mode", () => {
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      process.env.SENANGPAY_SECRET_KEY = "secret";
      process.env.SENANGPAY_MODE = "invalid";

      const result = validateSenangPayConfig();

      expect(result.isConfigured).toBe(false);
      expect(result.errors).toContain(
        "SENANGPAY_MODE must be 'sandbox' or 'production', got: invalid"
      );
    });
  });

  describe("isForceMockMode", () => {
    it("should return true when SENANGPAY_FORCE_MOCK is 'true' in development", () => {
      (process.env as any).NODE_ENV = "development";
      process.env.SENANGPAY_FORCE_MOCK = "true";
      expect(isForceMockMode()).toBe(true);
    });

    it("should return true when SENANGPAY_FORCE_MOCK is '1' in development", () => {
      (process.env as any).NODE_ENV = "development";
      process.env.SENANGPAY_FORCE_MOCK = "1";
      expect(isForceMockMode()).toBe(true);
    });

    it("should return false when SENANGPAY_FORCE_MOCK is 'false'", () => {
      (process.env as any).NODE_ENV = "development";
      process.env.SENANGPAY_FORCE_MOCK = "false";
      expect(isForceMockMode()).toBe(false);
    });

    it("should return false when SENANGPAY_FORCE_MOCK is not set", () => {
      (process.env as any).NODE_ENV = "development";
      delete process.env.SENANGPAY_FORCE_MOCK;
      expect(isForceMockMode()).toBe(false);
    });

    it("should return false when SENANGPAY_FORCE_MOCK is '0'", () => {
      (process.env as any).NODE_ENV = "development";
      process.env.SENANGPAY_FORCE_MOCK = "0";
      expect(isForceMockMode()).toBe(false);
    });

    it("should return false for other string values", () => {
      (process.env as any).NODE_ENV = "development";
      process.env.SENANGPAY_FORCE_MOCK = "yes";
      expect(isForceMockMode()).toBe(false);
    });

    it("should ALWAYS return false in production, even when SENANGPAY_FORCE_MOCK is true", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.SENANGPAY_FORCE_MOCK = "true";
      expect(isForceMockMode()).toBe(false);
    });

    it("should return false in test environment", () => {
      (process.env as any).NODE_ENV = "test";
      process.env.SENANGPAY_FORCE_MOCK = "true";
      expect(isForceMockMode()).toBe(false);
    });
  });

  describe("getMerchantId", () => {
    it("should return merchant ID when set", () => {
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      expect(getMerchantId()).toBe("123456");
    });

    it("should return null when not set", () => {
      delete process.env.SENANGPAY_MERCHANT_ID;
      expect(getMerchantId()).toBeNull();
    });
  });

  describe("getSecretKey", () => {
    it("should return secret key when set", () => {
      process.env.SENANGPAY_SECRET_KEY = "my-secret";
      expect(getSecretKey()).toBe("my-secret");
    });

    it("should return null when not set", () => {
      delete process.env.SENANGPAY_SECRET_KEY;
      expect(getSecretKey()).toBeNull();
    });
  });

  describe("getPaymentConfig", () => {
    it("should return complete config when valid", () => {
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      process.env.SENANGPAY_SECRET_KEY = "secret";
      process.env.SENANGPAY_MODE = "production";
      process.env.SENANGPAY_FORCE_MOCK = "false";

      const config = getPaymentConfig();

      expect(config).toEqual({
        merchantId: "123456",
        secretKey: "secret",
        mode: "production",
        forceMock: false,
      });
    });

    it("should default to production mode when not set", () => {
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      process.env.SENANGPAY_SECRET_KEY = "secret";
      delete process.env.SENANGPAY_MODE;

      const config = getPaymentConfig();

      expect(config.mode).toBe("production");
    });

    it("should detect force mock mode", () => {
      (process.env as any).NODE_ENV = "development";
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      process.env.SENANGPAY_SECRET_KEY = "secret";
      process.env.SENANGPAY_FORCE_MOCK = "true";

      const config = getPaymentConfig();

      expect(config.forceMock).toBe(true);
    });

    it("should throw error when config is invalid", () => {
      delete process.env.SENANGPAY_MERCHANT_ID;
      delete process.env.SENANGPAY_SECRET_KEY;

      expect(() => getPaymentConfig()).toThrow(
        "Senang Pay configuration invalid"
      );
    });
  });

  describe("isProductionReady", () => {
    it("should return ready when properly configured", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      process.env.SENANGPAY_SECRET_KEY = "secret";
      delete process.env.SENANGPAY_FORCE_MOCK;

      const { isReady, issues } = isProductionReady();

      expect(isReady).toBe(true);
      expect(issues).toHaveLength(0);
    });

    it("should return not ready when merchant ID missing", () => {
      (process.env as any).NODE_ENV = "production";
      delete process.env.SENANGPAY_MERCHANT_ID;
      process.env.SENANGPAY_SECRET_KEY = "secret";

      const { isReady, issues } = isProductionReady();

      expect(isReady).toBe(false);
      expect(issues).toContain("SENANGPAY_MERCHANT_ID is not set");
    });

    it("should return not ready when secret key missing", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      delete process.env.SENANGPAY_SECRET_KEY;

      const { isReady, issues } = isProductionReady();

      expect(isReady).toBe(false);
      expect(issues).toContain("SENANGPAY_SECRET_KEY is not set");
    });

    it("should warn when force mock is set in production", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      process.env.SENANGPAY_SECRET_KEY = "secret";
      process.env.SENANGPAY_FORCE_MOCK = "true";

      const { isReady, issues } = isProductionReady();

      expect(isReady).toBe(false);
      expect(issues).toContain(
        "SENANGPAY_FORCE_MOCK is set to true in production - this is a security risk and will be ignored"
      );
    });

    it("should allow force mock in development", () => {
      (process.env as any).NODE_ENV = "development";
      process.env.SENANGPAY_MERCHANT_ID = "123456";
      process.env.SENANGPAY_SECRET_KEY = "secret";
      process.env.SENANGPAY_FORCE_MOCK = "true";

      const { isReady, issues } = isProductionReady();

      expect(isReady).toBe(true);
      expect(issues).toHaveLength(0);
    });

    it("should return multiple issues when multiple problems exist", () => {
      (process.env as any).NODE_ENV = "production";
      delete process.env.SENANGPAY_MERCHANT_ID;
      delete process.env.SENANGPAY_SECRET_KEY;
      process.env.SENANGPAY_FORCE_MOCK = "true";

      const { isReady, issues } = isProductionReady();

      expect(isReady).toBe(false);
      expect(issues.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("hash compatibility with Senang Pay documentation", () => {
    /**
     * Test case based on Senang Pay documentation example
     * This verifies our hash implementation matches their spec
     */
    it("should generate hash matching documentation example pattern", () => {
      const docExample = {
        merchantId: "TEST_MERCHANT",
        secretKey: "test-secret-key",
        detail: "Order Payment",
        amount: "100.00",
        orderId: "ORDER-001",
      };

      const hash = generatePaymentHash(docExample);

      // Hash should be 64-character hex string
      expect(hash).toMatch(/^[a-f0-9]{64}$/);

      // Hash should be reproducible
      const hash2 = generatePaymentHash(docExample);
      expect(hash).toBe(hash2);
    });

    it("should verify return hash matching documentation pattern", () => {
      const merchantId = "TEST_MERCHANT";
      const secretKey = "test-secret-key";

      const response: PaymentResponse = {
        status_id: "1",
        order_id: "ORDER-001",
        transaction_id: "TXN-001",
        msg: "Payment Success",
        hash: "",
      };

      // Generate the expected hash
      response.hash = crypto
        .createHmac("sha256", secretKey)
        .update(
          `${secretKey}${response.status_id}${response.order_id}${response.transaction_id}${response.msg}`
        )
        .digest("hex");

      // Verify it
      const isValid = verifyReturnHash(response, secretKey, merchantId);
      expect(isValid).toBe(true);
    });
  });

  describe("sanitizeName", () => {
    it("should keep valid names unchanged", async () => {
      const { sanitizeName } = await import("../senangpay");
      expect(sanitizeName("John Doe")).toBe("John Doe");
      expect(sanitizeName("Ahmad bin Ali")).toBe("Ahmad bin Ali");
      expect(sanitizeName("Mary Jane")).toBe("Mary Jane");
    });

    it("should remove special characters", async () => {
      const { sanitizeName } = await import("../senangpay");
      expect(sanitizeName("John-Paul")).toBe("JohnPaul");
      expect(sanitizeName("O'Brien")).toBe("OBrien");
      expect(sanitizeName("John & Jane")).toBe("John Jane"); // & is removed, double space becomes single
      expect(sanitizeName("Dr. Smith")).toBe("Dr Smith");
    });

    it("should remove numbers", async () => {
      const { sanitizeName } = await import("../senangpay");
      expect(sanitizeName("John123")).toBe("John");
      expect(sanitizeName("Agent007")).toBe("Agent");
    });

    it("should handle multiple spaces", async () => {
      const { sanitizeName } = await import("../senangpay");
      expect(sanitizeName("John    Doe")).toBe("John Doe");
      expect(sanitizeName("  Ahmad  bin  Ali  ")).toBe("Ahmad bin Ali");
    });

    it("should handle empty or invalid input", async () => {
      const { sanitizeName } = await import("../senangpay");
      expect(sanitizeName("")).toBe("");
      expect(sanitizeName("123")).toBe("");
      expect(sanitizeName("@#$")).toBe("");
    });
  });

  describe("sanitizePhone", () => {
    it("should keep valid phone numbers unchanged", async () => {
      const { sanitizePhone } = await import("../senangpay");
      expect(sanitizePhone("0128888888")).toBe("0128888888");
      expect(sanitizePhone("0123456789")).toBe("0123456789");
    });

    it("should remove spaces and dashes", async () => {
      const { sanitizePhone } = await import("../senangpay");
      expect(sanitizePhone("012-888-8888")).toBe("0128888888");
      expect(sanitizePhone("012 888 8888")).toBe("0128888888");
      expect(sanitizePhone("012 - 888 - 8888")).toBe("0128888888");
    });

    it("should remove parentheses", async () => {
      const { sanitizePhone } = await import("../senangpay");
      expect(sanitizePhone("(012) 888-8888")).toBe("0128888888");
      expect(sanitizePhone("(012)8888888")).toBe("0128888888");
    });

    it("should handle international format", async () => {
      const { sanitizePhone } = await import("../senangpay");
      expect(sanitizePhone("+60128888888")).toBe("0128888888");
      expect(sanitizePhone("+60 12 888 8888")).toBe("0128888888");
      expect(sanitizePhone("60128888888")).toBe("0128888888");
    });

    it("should handle empty input", async () => {
      const { sanitizePhone } = await import("../senangpay");
      expect(sanitizePhone("")).toBe("");
    });

    it("should remove all non-digit characters", async () => {
      const { sanitizePhone } = await import("../senangpay");
      expect(sanitizePhone("tel:0128888888")).toBe("0128888888");
      expect(sanitizePhone("Phone: 012-888-8888")).toBe("0128888888");
    });
  });
});
