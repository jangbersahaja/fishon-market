/**
 * SMS Service - Exabytes Integration
 *
 * This service sends transactional SMS notifications for booking transactions
 * using the Exabytes SMS API (https://support.exabytes.com.my/en/support/solutions/articles/14000110847-bulk-sms-api-integration)
 *
 * Implementation Date: November 20, 2025
 * Provider: Exabytes Bulk SMS
 * Region: Malaysia only (60XXX prefix)
 */

// ============================================================================
// TYPES & VALIDATION
// ============================================================================

interface SMSParams {
  phone: string;
  message: string;
}

/**
 * Validate Malaysian phone number format
 * Accepts: 60xxxxxxxxx, 0xxxxxxxxx, +60xxxxxxxxx
 * Returns normalized 60xxxxxxxxx format
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const normalized = phone.replace(/\D/g, "");

  // Handle different formats
  if (normalized.startsWith("60")) {
    return normalized;
  }

  // Convert 0xxxxxxxxx to 60xxxxxxxxx
  if (normalized.startsWith("0")) {
    return "6" + normalized;
  }

  // Assume missing country code for 9-10 digit numbers
  if (normalized.length === 9 || normalized.length === 10) {
    return "60" + normalized;
  }

  throw new Error(`Invalid Malaysian phone number: ${phone}`);
}

/**
 * Validate phone number is Malaysian format
 */
export function isValidMalaysianPhone(phone: string): boolean {
  try {
    const normalized = normalizePhoneNumber(phone);
    // Malaysia: 60 + 9-10 digits
    return /^60\d{9,10}$/.test(normalized);
  } catch {
    return false;
  }
}

/**
 * Truncate message to 160 characters (1 SMS)
 * Exabytes supports up to 700 chars, but we limit to 1 SMS as per requirements
 */
export function truncateMessage(
  message: string,
  maxChars: number = 160
): string {
  if (message.length <= maxChars) {
    return message;
  }
  return message.substring(0, maxChars - 3) + "...";
}

/**
 * Validate Exabytes credentials
 */
function validateExabytesConfig(): void {
  const username = process.env.EXABYTES_SMS_USERNAME;
  const password = process.env.EXABYTES_SMS_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "SMS service not configured. Missing EXABYTES_SMS_USERNAME or EXABYTES_SMS_PASSWORD"
    );
  }
}

/**
 * Send SMS via Exabytes API
 * @param phone Malaysian phone number (60xxxxxxxxx or 0xxxxxxxxx format)
 * @param message SMS message body (max 160 chars, will be truncated)
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
    validateExabytesConfig();

    // Normalize and validate phone
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!isValidMalaysianPhone(normalizedPhone)) {
      throw new Error(`Invalid Malaysian phone number: ${phone}`);
    }

    // Truncate message to 1 SMS (160 chars)
    const truncatedMessage = truncateMessage(message);

    // Build Exabytes API URL
    const apiUrl = "https://smsportal.exabytes.my/isms_send.php";
    const params = new URLSearchParams({
      un: process.env.EXABYTES_SMS_USERNAME!,
      pwd: process.env.EXABYTES_SMS_PASSWORD!,
      dstno: normalizedPhone,
      msg: truncatedMessage,
      type: "1", // ASCII text
      agreedterm: "YES",
    });

    const fullUrl = `${apiUrl}?${params.toString()}`;

    // Send HTTP request to Exabytes with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(fullUrl, {
        method: "GET",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Exabytes API error: ${response.status} ${response.statusText}`
        );
      }

      const responseText = await response.text();

      // Parse Exabytes response
      // Success format: "0|Message sent|MessageID"
      // Error format: "1|Error message|0"
      const parts = responseText.split("|");
      const statusCode = parts[0];

      if (statusCode === "0") {
        const messageId = parts[2]?.trim();
        console.log("[SMS] Sent successfully", {
          phone: normalizedPhone,
          messageLength: truncatedMessage.length,
          messageId,
        });
        return {
          success: true,
          messageId,
        };
      } else {
        const errorMessage = parts[1] || "Unknown error";
        console.error("[SMS] API returned error", {
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
    console.error("[SMS] Send failed", {
      phone,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// BOOKING SMS TEMPLATES
// ============================================================================

interface SendBookingCreatedSMSParams {
  phone: string;
  charterName: string;
  tripDate: string;
  totalPrice: string;
}

export async function sendBookingCreatedSMS(
  params: SendBookingCreatedSMSParams
) {
  const message = `Fishon: Your booking for ${params.charterName} on ${params.tripDate} has been received. Total: RM${params.totalPrice}. We will notify you once the captain approves.`;
  return sendSMSViaExabytes(params.phone, message);
}

interface SendBookingApprovedSMSParams {
  phone: string;
  charterName: string;
  tripDate: string;
}

export async function sendBookingApprovedSMS(
  params: SendBookingApprovedSMSParams
) {
  const message = `Fishon: Great news! Your booking for ${params.charterName} on ${params.tripDate} has been approved by the captain. Please complete payment to confirm.`;
  return sendSMSViaExabytes(params.phone, message);
}

interface SendBookingRejectedSMSParams {
  phone: string;
  charterName: string;
  reason?: string;
}

export async function sendBookingRejectedSMS(
  params: SendBookingRejectedSMSParams
) {
  const reasonText = params.reason
    ? ` Reason: ${params.reason}`
    : " Please check other available dates.";
  const message = `Fishon: Unfortunately, your booking for ${params.charterName} was rejected by the captain.${reasonText}`;
  return sendSMSViaExabytes(params.phone, message);
}

interface SendBookingPaidSMSParams {
  phone: string;
  charterName: string;
  tripDate: string;
  tripName?: string;
}

export async function sendBookingPaidSMS(params: SendBookingPaidSMSParams) {
  const tripInfo = params.tripName
    ? `${params.tripName} on ${params.tripDate}`
    : params.tripDate;
  const message = `Fishon: Payment received! Your booking for ${params.charterName} (${tripInfo}) is confirmed. Check your email for details.`;
  return sendSMSViaExabytes(params.phone, message);
}

interface SendBookingCancelledSMSParams {
  phone: string;
  charterName: string;
  tripDate: string;
  reason?: string;
}

export async function sendBookingCancelledSMS(
  params: SendBookingCancelledSMSParams
) {
  const reasonText = params.reason ? ` Reason: ${params.reason}.` : "";
  const message = `Fishon: Your booking for ${params.charterName} on ${params.tripDate} has been cancelled.${reasonText} Check your email for refund details.`;
  return sendSMSViaExabytes(params.phone, message);
}

interface SendPaymentRefundedSMSParams {
  phone: string;
  charterName: string;
  refundAmount: string;
}

export async function sendPaymentRefundedSMS(
  params: SendPaymentRefundedSMSParams
) {
  const message = `Fishon: Refund processed! RM${params.refundAmount} from your ${params.charterName} booking has been returned to your account.`;
  return sendSMSViaExabytes(params.phone, message);
}

interface SendPaymentFailedSMSParams {
  phone: string;
  charterName: string;
  tripDate: string;
}

export async function sendPaymentFailedSMS(params: SendPaymentFailedSMSParams) {
  const message = `Fishon: Payment for your ${params.charterName} booking on ${params.tripDate} failed. Please retry or contact support.`;
  return sendSMSViaExabytes(params.phone, message);
}

interface SendReviewSubmittedSMSParams {
  phone: string;
  charterName: string;
}

export async function sendReviewSubmittedSMS(
  params: SendReviewSubmittedSMSParams
) {
  const message = `Fishon: Thank you! Your review for ${params.charterName} has been submitted and is pending moderation.`;
  return sendSMSViaExabytes(params.phone, message);
}

interface SendReviewApprovedSMSParams {
  phone: string;
  charterName: string;
}

export async function sendReviewApprovedSMS(
  params: SendReviewApprovedSMSParams
) {
  const message = `Fishon: Your review for ${params.charterName} has been approved and published!`;
  return sendSMSViaExabytes(params.phone, message);
}

interface SendAccountVerifiedSMSParams {
  phone: string;
  userName?: string;
}

export async function sendAccountVerifiedSMS(
  params: SendAccountVerifiedSMSParams
) {
  const name = params.userName ? ` ${params.userName}` : "";
  const message = `Fishon: Welcome${name}! Your account has been verified. Start exploring amazing fishing charters now!`;
  return sendSMSViaExabytes(params.phone, message);
}
