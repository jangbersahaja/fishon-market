/**
 * Senang Pay Payment Gateway Utilities
 *
 * This module provides hash generation and verification functions for Senang Pay integration.
 * Documentation: https://app.senangpay.my/docs
 *
 * Hash Algorithm: HMAC-SHA256
 * - Payment Request Hash: HMAC(secret_key, merchant_id + detail + amount + order_id)
 * - Return/Callback Hash: HMAC(secret_key, merchant_id + status_id + order_id + transaction_id + msg)
 */

import crypto from "crypto";

export interface PaymentDetails {
  merchantId: string;
  secretKey: string;
  detail: string;
  amount: string; // Format: "100.00" (always 2 decimal places)
  orderId: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface PaymentResponse {
  status_id: string; // "1" = success, "0" = failed
  order_id: string;
  transaction_id: string;
  msg: string;
  hash: string;
}

export interface PaymentConfig {
  isConfigured: boolean;
  errors: string[];
}

/**
 * Generate payment hash for Senang Pay request
 *
 * @param params - Payment details including merchant ID, secret key, detail, amount, and order ID
 * @returns HMAC-SHA256 hash as hexadecimal string
 *
 * @example
 * ```typescript
 * const hash = generatePaymentHash({
 *   merchantId: "123456",
 *   secretKey: "abc123xyz",
 *   detail: "Fishing Charter Booking",
 *   amount: "500.00",
 *   orderId: "booking-abc123"
 * });
 * ```
 */
export function generatePaymentHash({
  merchantId,
  secretKey,
  detail,
  amount,
  orderId,
}: PaymentDetails): string {
  // Per Senang Pay documentation: hash = HMAC-SHA256(secretkey + detail + amount + order_id)
  // Note: merchantId is NOT included in payment hash, but secretKey is prepended to message
  const message = `${secretKey}${detail}${amount}${orderId}`;
  return crypto.createHmac("sha256", secretKey).update(message).digest("hex");
}

/**
 * Verify return/callback hash from Senang Pay
 *
 * Security: Always verify the hash before processing payment confirmations
 * to prevent tampering and ensure authenticity.
 *
 * @param response - Payment response from Senang Pay (return URL or callback)
 * @param secretKey - Your Senang Pay secret key
 * @param merchantId - Your Senang Pay merchant ID
 * @returns true if hash is valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = verifyReturnHash(
 *   {
 *     status_id: "1",
 *     order_id: "booking-abc123",
 *     transaction_id: "TXN123456",
 *     msg: "Payment Success",
 *     hash: "received-hash-from-senangpay"
 *   },
 *   "your-secret-key",
 *   "your-merchant-id"
 * );
 *
 * if (!isValid) {
 *   throw new Error("Invalid payment hash - possible tampering");
 * }
 * ```
 */
export function verifyReturnHash(
  response: PaymentResponse,
  secretKey: string,
  merchantId: string
): boolean {
  // Per Senang Pay documentation: hash = HMAC-SHA256(secretkey + status_id + order_id + transaction_id + msg)
  // Note: merchantId is NOT used, but secretKey is prepended to message
  const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(
      `${secretKey}${response.status_id}${response.order_id}${response.transaction_id}${response.msg}`
    )
    .digest("hex");

  return expectedHash === response.hash;
}

/**
 * Get Senang Pay payment URL based on environment mode
 *
 * @returns Complete payment gateway URL
 * @throws Error if SENANGPAY_MERCHANT_ID is not configured
 *
 * @example
 * ```typescript
 * // With SENANGPAY_MODE=production
 * const url = getSenangPayUrl();
 * // Returns: https://app.senangpay.my/payment/123456
 * ```
 */
export function getSenangPayUrl(): string {
  const mode = process.env.SENANGPAY_MODE || "production";
  const merchantId = process.env.SENANGPAY_MERCHANT_ID;

  if (!merchantId) {
    throw new Error("SENANGPAY_MERCHANT_ID is not configured");
  }

  if (mode === "sandbox") {
    return `https://sandbox.senangpay.my/payment/${merchantId}`;
  }

  return `https://app.senangpay.my/payment/${merchantId}`;
}

/**
 * Format amount for Senang Pay (must be "100.00" format with exactly 2 decimal places)
 *
 * @param amount - Numeric amount (e.g., 100 or 99.5)
 * @returns Formatted string with 2 decimal places (e.g., "100.00")
 *
 * @example
 * ```typescript
 * formatAmount(100)     // "100.00"
 * formatAmount(99.5)    // "99.50"
 * formatAmount(123.456) // "123.46" (rounded)
 * ```
 */
export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Validate Senang Pay configuration
 *
 * Checks if required environment variables are present and properly configured.
 * Use this to determine whether to use Senang Pay or fallback to mock payment.
 *
 * @returns Configuration status and any error messages
 *
 * @example
 * ```typescript
 * const { isConfigured, errors } = validateSenangPayConfig();
 *
 * if (!isConfigured) {
 *   console.warn("Senang Pay not configured:", errors);
 *   // Use mock payment fallback
 * }
 * ```
 */
export function validateSenangPayConfig(): PaymentConfig {
  const errors: string[] = [];
  const merchantId = process.env.SENANGPAY_MERCHANT_ID;
  const secretKey = process.env.SENANGPAY_SECRET_KEY;
  const mode = process.env.SENANGPAY_MODE;

  if (!merchantId) {
    errors.push("SENANGPAY_MERCHANT_ID is not set");
  }

  if (!secretKey) {
    errors.push("SENANGPAY_SECRET_KEY is not set");
  }

  // Validate mode if present
  if (mode && !["sandbox", "production"].includes(mode)) {
    errors.push(
      `SENANGPAY_MODE must be 'sandbox' or 'production', got: ${mode}`
    );
  }

  return {
    isConfigured: errors.length === 0,
    errors,
  };
}

/**
 * Check if force mock mode is enabled
 *
 * SECURITY: Force mock is ONLY available in development environment.
 * In production, this will always return false regardless of environment variable.
 *
 * When SENANGPAY_FORCE_MOCK=true AND NODE_ENV=development, the payment system
 * can use mock payment for testing. This is useful for:
 * - Local development testing without making real charges
 * - Feature development with production credentials
 * - Testing payment UI flows
 *
 * @returns true if mock mode is forced AND in development, false otherwise
 *
 * @example
 * ```typescript
 * const { isConfigured } = validateSenangPayConfig();
 * const isDev = process.env.NODE_ENV === 'development';
 *
 * if (!isConfigured) {
 *   // Show error - payment gateway required
 *   return <PaymentConfigurationError />;
 * }
 *
 * if (isDev && isForceMockMode()) {
 *   // Development only: Use mock payment
 *   return <MockPaymentForDevelopment />;
 * }
 *
 * // Production: Real Senang Pay (the only path)
 * return <SenangPayPaymentForm />;
 * ```
 */
export function isForceMockMode(): boolean {
  // SECURITY: Only allow mock mode in development
  const isDevelopment = process.env.NODE_ENV === "development";
  if (!isDevelopment) {
    return false;
  }

  const forceMock = process.env.SENANGPAY_FORCE_MOCK;
  return forceMock === "true" || forceMock === "1";
} /**
 * Get merchant ID from environment
 *
 * @returns Merchant ID or null if not configured
 */
export function getMerchantId(): string | null {
  return process.env.SENANGPAY_MERCHANT_ID || null;
}

/**
 * Get secret key from environment
 *
 * @returns Secret key or null if not configured
 * @internal - Only use server-side, never expose to client
 */
export function getSecretKey(): string | null {
  return process.env.SENANGPAY_SECRET_KEY || null;
}

/**
 * Get full payment configuration from environment
 *
 * @returns Object with all Senang Pay configuration values
 * @throws Error if configuration is invalid
 *
 * @example
 * ```typescript
 * const config = getPaymentConfig();
 * const hash = generatePaymentHash({
 *   merchantId: config.merchantId,
 *   secretKey: config.secretKey,
 *   detail: "Charter Booking",
 *   amount: "500.00",
 *   orderId: "booking-123"
 * });
 * ```
 */
export function getPaymentConfig() {
  const { isConfigured, errors } = validateSenangPayConfig();

  if (!isConfigured) {
    throw new Error(`Senang Pay configuration invalid: ${errors.join(", ")}`);
  }

  return {
    merchantId: process.env.SENANGPAY_MERCHANT_ID!,
    secretKey: process.env.SENANGPAY_SECRET_KEY!,
    mode: process.env.SENANGPAY_MODE || "production",
    forceMock: isForceMockMode(),
  };
}

/**
 * Check if payment gateway is ready for production use
 *
 * This validates that:
 * - Senang Pay is properly configured
 * - Force mock mode is disabled (or we're in development)
 * - Production mode is set correctly
 *
 * @returns Object with readiness status and any blocking issues
 *
 * @example
 * ```typescript
 * const { isReady, issues } = isProductionReady();
 *
 * if (!isReady) {
 *   console.error("Payment gateway not ready:", issues);
 *   // Show error page to user
 * }
 * ```
 */
export function isProductionReady(): {
  isReady: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const { isConfigured, errors } = validateSenangPayConfig();

  if (!isConfigured) {
    issues.push(...errors);
  }

  // In production, force mock should never be active
  if (process.env.NODE_ENV === "production") {
    const forceMock = process.env.SENANGPAY_FORCE_MOCK;
    if (forceMock === "true" || forceMock === "1") {
      issues.push(
        "SENANGPAY_FORCE_MOCK is set to true in production - this is a security risk and will be ignored"
      );
    }
  }

  return {
    isReady: issues.length === 0,
    issues,
  };
}
