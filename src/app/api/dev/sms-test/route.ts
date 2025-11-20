/**
 * SMS Test API Endpoint
 * Development only - for testing SMS notifications
 *
 * POST /api/dev/sms-test
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Validate that this is development environment
 */
function isDevelopmentOnly() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.VERCEL_ENV === "preview"
  );
}

/**
 * Normalize Malaysian phone number
 */
function normalizePhoneNumber(phone: string): string {
  const normalized = phone.replace(/\D/g, "");

  if (normalized.startsWith("60")) {
    return normalized;
  }

  if (normalized.startsWith("0")) {
    return "6" + normalized;
  }

  if (normalized.length === 9 || normalized.length === 10) {
    return "60" + normalized;
  }

  throw new Error(`Invalid Malaysian phone number: ${phone}`);
}

/**
 * Validate phone number is Malaysian format
 */
function isValidMalaysianPhone(phone: string): boolean {
  try {
    const normalized = normalizePhoneNumber(phone);
    return /^60\d{9,10}$/.test(normalized);
  } catch {
    return false;
  }
}

/**
 * Truncate message to 160 characters
 */
function truncateMessage(message: string): string {
  if (message.length <= 160) {
    return message;
  }
  return message.substring(0, 157) + "...";
}

/**
 * Send SMS via Exabytes API
 */
async function sendSMSViaExabytes(
  phone: string,
  message: string
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const username = process.env.EXABYTES_SMS_USERNAME;
    const password = process.env.EXABYTES_SMS_PASSWORD;

    if (!username || !password) {
      throw new Error("SMS credentials not configured");
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!isValidMalaysianPhone(normalizedPhone)) {
      throw new Error(`Invalid Malaysian phone number: ${phone}`);
    }

    const truncatedMessage = truncateMessage(message);

    const params = new URLSearchParams({
      un: username,
      pwd: password,
      dstno: normalizedPhone,
      msg: truncatedMessage,
      type: "1",
      agreedterm: "YES",
    });

    const apiUrl = `https://smsportal.exabytes.my/isms_send.php?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Exabytes API error: ${response.status}`);
      }

      const responseText = await response.text();

      // Parse response: "0|Message sent|MessageID" (success)
      const parts = responseText.split("|");
      const statusCode = parts[0]?.trim();

      if (statusCode === "0") {
        const messageId = parts[2]?.trim();
        console.log("[SMS Dev Test] Sent successfully", {
          phone: normalizedPhone,
          messageLength: truncatedMessage.length,
          messageId,
        });
        return {
          success: true,
          messageId,
        };
      } else {
        const errorMessage = parts[1]?.trim() || responseText;
        console.error("[SMS Dev Test] API returned error", {
          phone: normalizedPhone,
          statusCode,
          errorMessage,
        });
        return {
          success: false,
          error: errorMessage,
        };
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[SMS Dev Test] Failed", {
      phone,
      error: errorMessage,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle POST request
 */
export async function POST(request: NextRequest) {
  try {
    // Allow in development/preview only
    if (!isDevelopmentOnly()) {
      return NextResponse.json(
        { error: "SMS test endpoint only available in development" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { phone, notificationType, customMessage, templateData } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    if (!notificationType && !customMessage) {
      return NextResponse.json(
        { error: "Either notificationType or customMessage is required" },
        { status: 400 }
      );
    }

    // Use custom message or generate from template
    const message =
      customMessage || generateTemplateMessage(notificationType, templateData);

    if (!message) {
      return NextResponse.json(
        { error: "Failed to generate message" },
        { status: 400 }
      );
    }

    // Send SMS
    const result = await sendSMSViaExabytes(phone, message);

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: "SMS sent successfully",
          messageId: result.messageId,
          details: {
            phone,
            messageLength: message.length,
            truncated: message.length > 160,
          },
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          details: "Failed to send SMS via Exabytes",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[SMS Dev Test] Endpoint error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Generate SMS message from template
 */
function generateTemplateMessage(
  type: string,
  data: Record<string, string> = {}
): string {
  const templates: Record<string, (data: Record<string, string>) => string> = {
    BOOKING_CREATED: () =>
      `Fishon: Your booking for ${data.charterName} on ${data.tripDate} has been received. Total: RM${data.totalPrice}. We will notify you once the captain approves.`,
    BOOKING_APPROVED: () =>
      `Fishon: Great news! Your booking for ${data.charterName} on ${data.tripDate} has been approved by the captain. Please complete payment to confirm.`,
    BOOKING_REJECTED: () =>
      `Fishon: Unfortunately, your booking for ${data.charterName} was rejected by the captain. ${data.reason || "Please check other available dates."}`,
    BOOKING_PAID: () =>
      `Fishon: Payment received! Your booking for ${data.charterName} (${data.tripDate}) is confirmed. Check your email for details.`,
    BOOKING_CANCELLED: () =>
      `Fishon: Your booking for ${data.charterName} on ${data.tripDate} has been cancelled. Refund: RM${data.refundAmount}.`,
    PAYMENT_REFUNDED: () =>
      `Fishon: Refund processed. Amount: RM${data.refundAmount} has been credited to your account.`,
    PAYMENT_FAILED: () =>
      `Fishon: Payment failed for booking ${data.bookingId}. Please retry or contact support.`,
    REVIEW_SUBMITTED: () =>
      `Fishon: Your review has been submitted and is awaiting moderation. Thank you!`,
    REVIEW_APPROVED: () =>
      `Fishon: Your review for ${data.charterName} is now published. Other anglers can see it!`,
    ACCOUNT_VERIFIED: () =>
      `Fishon: Your account has been verified. Enjoy booking charters on Fishon!`,
  };

  return templates[type]?.(data) || "";
}
