/**
 * Payment Gateway Abstraction Layer
 *
 * Supports dual-flow booking system with Senang Pay:
 *
 * FLOW A: Card Tokenization (Pseudo Pre-Authorization)
 * - Store card token WITHOUT charging
 * - Charge only when captain approves
 * - Delete token if captain rejects (no refund needed)
 *
 * FLOW B: Direct Payment (FPX/E-wallet - Immediate Charge)
 * - Redirect to bank/e-wallet gateway
 * - Payment completes immediately
 * - MUST refund if captain rejects
 *
 * This abstraction allows switching payment providers (Stripe, etc.) in future.
 */

import crypto from "crypto";
import { formatAmount, sanitizeName, sanitizePhone } from "./senangpay";

export type PaymentMethod = "CARD" | "FPX" | "EWALLET" | "MOCK";
export type PaymentFlow = "TOKENIZED" | "DIRECT";

export interface PaymentIntentResult {
  success: boolean;
  flow: PaymentFlow;
  paymentIntentId: string; // Token ID for TOKENIZED, transaction ID for DIRECT
  paymentMethod: PaymentMethod;
  amount: number;
  requiresRedirect: boolean; // true for FPX/E-wallet
  redirectUrl?: string; // FPX/E-wallet payment URL
  error?: string;
}

export interface CapturePaymentResult {
  success: boolean;
  transactionId: string;
  chargedAt: Date;
  error?: string;
}

export interface ReleasePaymentResult {
  success: boolean;
  releasedAt: Date;
  error?: string;
}

export interface RefundPaymentResult {
  success: boolean;
  refundTransactionId: string;
  refundedAmount: number;
  refundedAt: Date;
  error?: string;
}

interface SenangPayConfig {
  merchantId: string;
  secretKey: string;
  mode: "sandbox" | "production";
  tokenizationUrl: string;
  paymentUrl: string;
}

/**
 * Get Senang Pay configuration from environment
 */
function getSenangPayConfig(): SenangPayConfig {
  const merchantId = process.env.SENANGPAY_MERCHANT_ID;
  const secretKey = process.env.SENANGPAY_SECRET_KEY;
  const mode =
    (process.env.SENANGPAY_MODE as "sandbox" | "production") || "production";

  if (!merchantId || !secretKey) {
    throw new Error(
      "Senang Pay not configured. Set SENANGPAY_MERCHANT_ID and SENANGPAY_SECRET_KEY."
    );
  }

  const baseUrl =
    mode === "sandbox"
      ? "https://sandbox.senangpay.my"
      : "https://app.senangpay.my";

  return {
    merchantId,
    secretKey,
    mode,
    tokenizationUrl: `${baseUrl}/apiv1/create_token`,
    paymentUrl: `${baseUrl}/payment/${merchantId}`,
  };
}

/**
 * Generate hash for Senang Pay request
 */
function generateHash(data: string, secretKey: string): string {
  return crypto.createHmac("sha256", secretKey).update(data).digest("hex");
}

/**
 * Create payment intent (authorization for card, immediate charge for FPX/E-wallet)
 *
 * CARD FLOW:
 * - Stores card token
 * - Does NOT charge immediately
 * - Returns token ID to store in booking.paymentIntentId
 *
 * FPX/E-WALLET FLOW:
 * - Returns payment URL
 * - User redirected to complete payment
 * - Payment happens immediately
 * - Callback receives transaction ID
 *
 * @param params - Payment parameters
 * @returns Payment intent result
 */
export async function createPaymentIntent(params: {
  bookingId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  cardDetails?: {
    number: string;
    cvv: string;
    expiryMonth: string;
    expiryYear: string;
  };
}): Promise<PaymentIntentResult> {
  const config = getSenangPayConfig();
  const {
    bookingId,
    amount,
    paymentMethod,
    customerName,
    customerEmail,
    customerPhone,
    description,
    cardDetails,
  } = params;

  // Determine payment flow based on method
  const flow: PaymentFlow = paymentMethod === "CARD" ? "TOKENIZED" : "DIRECT";

  try {
    if (flow === "TOKENIZED") {
      // CARD TOKENIZATION: Store card without charging
      if (!cardDetails) {
        return {
          success: false,
          flow: "TOKENIZED",
          paymentIntentId: "",
          paymentMethod: "CARD",
          amount,
          requiresRedirect: false,
          error: "Card details required for tokenization",
        };
      }

      // Call Senang Pay tokenization API
      const tokenData = {
        merchant_id: config.merchantId,
        card_number: cardDetails.number,
        card_cvv: cardDetails.cvv,
        card_expiry_month: cardDetails.expiryMonth,
        card_expiry_year: cardDetails.expiryYear,
        name: sanitizeName(customerName),
        email: customerEmail,
        phone: sanitizePhone(customerPhone),
      };

      const hash = generateHash(
        `${config.merchantId}${cardDetails.number}${cardDetails.cvv}`,
        config.secretKey
      );

      const response = await fetch(config.tokenizationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...tokenData,
          hash,
        }),
      });

      const result = await response.json();

      if (result.status === "1" && result.token_id) {
        // Token created successfully
        return {
          success: true,
          flow: "TOKENIZED",
          paymentIntentId: result.token_id,
          paymentMethod: "CARD",
          amount,
          requiresRedirect: false,
        };
      } else {
        return {
          success: false,
          flow: "TOKENIZED",
          paymentIntentId: "",
          paymentMethod: "CARD",
          amount,
          requiresRedirect: false,
          error: result.msg || "Card tokenization failed",
        };
      }
    } else {
      // DIRECT PAYMENT: Generate redirect URL for FPX/E-wallet
      const formattedAmount = formatAmount(amount);
      const hash = generateHash(
        `${config.secretKey}${description}${formattedAmount}${bookingId}`,
        config.secretKey
      );

      // Build payment URL with query parameters
      const paymentUrl = new URL(config.paymentUrl);
      paymentUrl.searchParams.append("detail", description);
      paymentUrl.searchParams.append("amount", formattedAmount);
      paymentUrl.searchParams.append("order_id", bookingId);
      paymentUrl.searchParams.append("name", sanitizeName(customerName));
      paymentUrl.searchParams.append("email", customerEmail);
      paymentUrl.searchParams.append("phone", sanitizePhone(customerPhone));
      paymentUrl.searchParams.append("hash", hash);

      // Add return and callback URLs
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
      paymentUrl.searchParams.append(
        "return_url",
        `${baseUrl}/api/payment/senangpay-return`
      );
      paymentUrl.searchParams.append(
        "callback_url",
        `${baseUrl}/api/payment/senangpay-callback`
      );

      return {
        success: true,
        flow: "DIRECT",
        paymentIntentId: bookingId, // Use booking ID, real transaction ID comes from callback
        paymentMethod,
        amount,
        requiresRedirect: true,
        redirectUrl: paymentUrl.toString(),
      };
    }
  } catch (error) {
    console.error("[Payment Gateway] Create payment intent failed:", error);
    return {
      success: false,
      flow,
      paymentIntentId: "",
      paymentMethod,
      amount,
      requiresRedirect: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Capture payment (charge card token)
 *
 * ONLY for TOKENIZED flow (card payments)
 * Called when captain approves booking
 *
 * @param paymentIntentId - Token ID from tokenization
 * @param amount - Amount to charge
 * @param orderId - Order ID for transaction
 * @returns Capture result
 */
export async function capturePayment(
  paymentIntentId: string,
  amount: number,
  orderId: string
): Promise<CapturePaymentResult> {
  const config = getSenangPayConfig();

  try {
    // Call Senang Pay charge token API
    const chargeData = {
      merchant_id: config.merchantId,
      token_id: paymentIntentId,
      order_id: orderId,
      amount: formatAmount(amount),
    };

    const hash = generateHash(
      `${config.merchantId}${paymentIntentId}${orderId}${formatAmount(amount)}`,
      config.secretKey
    );

    const chargeUrl = config.tokenizationUrl.replace(
      "/create_token",
      "/charge_token"
    );
    const response = await fetch(chargeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...chargeData,
        hash,
      }),
    });

    const result = await response.json();

    if (result.status === "1" && result.transaction_id) {
      return {
        success: true,
        transactionId: result.transaction_id,
        chargedAt: new Date(),
      };
    } else {
      return {
        success: false,
        transactionId: "",
        chargedAt: new Date(),
        error: result.msg || "Failed to charge card token",
      };
    }
  } catch (error) {
    console.error("[Payment Gateway] Capture payment failed:", error);
    return {
      success: false,
      transactionId: "",
      chargedAt: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Release payment (delete card token without charging)
 *
 * ONLY for TOKENIZED flow (card payments)
 * Called when captain rejects booking or authorization expires
 *
 * NOTE: Senang Pay tokenization API doesn't have explicit "release" endpoint.
 * Token expires automatically after 30 days if not charged.
 * We just mark it as released in our DB and don't charge it.
 *
 * @param paymentIntentId - Token ID to release
 * @returns Release result
 */
export async function releasePayment(
  paymentIntentId: string
): Promise<ReleasePaymentResult> {
  // NOTE: Senang Pay tokens expire automatically
  // No API call needed, just mark as released in our system
  console.log(
    `[Payment Gateway] Releasing token ${paymentIntentId} (will expire automatically)`
  );

  return {
    success: true,
    releasedAt: new Date(),
  };
}

/**
 * Refund payment
 *
 * For BOTH flows (TOKENIZED and DIRECT)
 * - TOKENIZED: Refund if card was already charged
 * - DIRECT: Refund FPX/E-wallet payment
 *
 * @param transactionId - Transaction ID from charge/payment
 * @param amount - Amount to refund
 * @param reason - Refund reason
 * @returns Refund result
 */
export async function refundPayment(
  transactionId: string,
  amount: number,
  reason: string
): Promise<RefundPaymentResult> {
  const config = getSenangPayConfig();

  try {
    // Call Senang Pay refund API
    const refundData = {
      merchant_id: config.merchantId,
      transaction_id: transactionId,
      amount: formatAmount(amount),
      reason,
    };

    const hash = generateHash(
      `${config.merchantId}${transactionId}${formatAmount(amount)}`,
      config.secretKey
    );

    const refundUrl = config.tokenizationUrl.replace(
      "/create_token",
      "/refund"
    );
    const response = await fetch(refundUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...refundData,
        hash,
      }),
    });

    const result = await response.json();

    if (result.status === "1") {
      return {
        success: true,
        refundTransactionId: result.refund_id || transactionId,
        refundedAmount: amount,
        refundedAt: new Date(),
      };
    } else {
      return {
        success: false,
        refundTransactionId: "",
        refundedAmount: 0,
        refundedAt: new Date(),
        error: result.msg || "Refund failed",
      };
    }
  } catch (error) {
    console.error("[Payment Gateway] Refund payment failed:", error);
    return {
      success: false,
      refundTransactionId: "",
      refundedAmount: 0,
      refundedAt: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get payment flow type from payment method
 */
export function getPaymentFlow(paymentMethod: PaymentMethod): PaymentFlow {
  return paymentMethod === "CARD" ? "TOKENIZED" : "DIRECT";
}

/**
 * Check if payment method requires immediate payment
 */
export function requiresImmediatePayment(
  paymentMethod: PaymentMethod
): boolean {
  return paymentMethod === "FPX" || paymentMethod === "EWALLET";
}

/**
 * Validate payment method
 */
export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return ["CARD", "FPX", "EWALLET"].includes(method);
}
