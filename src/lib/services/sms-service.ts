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

import { prisma } from "@/lib/database/prisma";

// ============================================================================
// TYPES & VALIDATION
// ============================================================================

interface SMSParams {
  phone: string;
  message: string;
}

interface SMSLogParams {
  userId?: string;
  phone: string;
  messageType: string;
  message: string;
  bookingId?: string;
  notificationId?: string;
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
 * Create SMS log entry
 */
async function createSMSLog(
  params: SMSLogParams & {
    status: "PENDING" | "SENT" | "FAILED" | "INVALID";
    messageId?: string;
    errorCode?: string;
    errorMessage?: string;
    requestPayload?: object;
    responsePayload?: object;
  }
) {
  try {
    return await prisma.sMSLog.create({
      data: {
        userId: params.userId,
        phone: params.phone,
        messageType: params.messageType,
        message: params.message,
        status: params.status,
        messageId: params.messageId,
        errorCode: params.errorCode,
        errorMessage: params.errorMessage,
        provider: "EXABYTES",
        requestPayload: params.requestPayload ?? undefined,
        responsePayload: params.responsePayload ?? undefined,
        sentAt: params.status === "SENT" ? new Date() : null,
        bookingId: params.bookingId,
        notificationId: params.notificationId,
      },
    });
  } catch (error) {
    // Don't fail SMS sending if logging fails
    console.error("[SMS] Failed to create SMS log:", error);
    return null;
  }
}

/**
 * Send SMS via Exabytes API
 * @param phone Malaysian phone number (60xxxxxxxxx or 0xxxxxxxxx format)
 * @param message SMS message body (max 160 chars, will be truncated)
 * @param logParams Optional logging parameters
 */
async function sendSMSViaExabytes(
  phone: string,
  message: string,
  logParams?: Omit<SMSLogParams, "phone" | "message">
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  logId?: string;
}> {
  let normalizedPhone = "";
  let truncatedMessage = "";

  try {
    validateExabytesConfig();

    // Normalize and validate phone
    normalizedPhone = normalizePhoneNumber(phone);
    if (!isValidMalaysianPhone(normalizedPhone)) {
      // Log invalid phone
      const log = await createSMSLog({
        ...logParams,
        phone: phone,
        messageType: logParams?.messageType || "UNKNOWN",
        message: message,
        status: "INVALID",
        errorMessage: `Invalid Malaysian phone number: ${phone}`,
      });

      return {
        success: false,
        error: `Invalid Malaysian phone number: ${phone}`,
        logId: log?.id,
      };
    }

    // Truncate message to 1 SMS (160 chars)
    truncatedMessage = truncateMessage(message);

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

    // Request payload for logging (without password)
    const requestPayload = {
      url: apiUrl,
      dstno: normalizedPhone,
      msgLength: truncatedMessage.length,
      type: "1",
    };

    // Send HTTP request to Exabytes with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(fullUrl, {
        method: "GET",
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorMsg = `Exabytes API error: ${response.status} ${response.statusText}`;

        // Log failed request
        const log = await createSMSLog({
          ...logParams,
          phone: normalizedPhone,
          messageType: logParams?.messageType || "UNKNOWN",
          message: truncatedMessage,
          status: "FAILED",
          errorCode: String(response.status),
          errorMessage: errorMsg,
          requestPayload,
          responsePayload: {
            status: response.status,
            statusText: response.statusText,
          },
        });

        return {
          success: false,
          error: errorMsg,
          logId: log?.id,
        };
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

        // Log successful send
        const log = await createSMSLog({
          ...logParams,
          phone: normalizedPhone,
          messageType: logParams?.messageType || "UNKNOWN",
          message: truncatedMessage,
          status: "SENT",
          messageId,
          requestPayload,
          responsePayload: { raw: responseText, parts },
        });

        return {
          success: true,
          messageId,
          logId: log?.id,
        };
      } else {
        const errorMessage = parts[1] || "Unknown error";
        console.error("[SMS] API returned error", {
          phone: normalizedPhone,
          statusCode,
          errorMessage,
        });

        // Log API error
        const log = await createSMSLog({
          ...logParams,
          phone: normalizedPhone,
          messageType: logParams?.messageType || "UNKNOWN",
          message: truncatedMessage,
          status: "FAILED",
          errorCode: statusCode,
          errorMessage,
          requestPayload,
          responsePayload: { raw: responseText, parts },
        });

        return {
          success: false,
          error: errorMessage,
          logId: log?.id,
        };
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[SMS] Send failed", {
      phone,
      error: errorMsg,
    });

    // Log exception
    await createSMSLog({
      ...logParams,
      phone: normalizedPhone || phone,
      messageType: logParams?.messageType || "UNKNOWN",
      message: truncatedMessage || message,
      status: "FAILED",
      errorMessage: errorMsg,
    });

    return {
      success: false,
      error: errorMsg,
    };
  }
}

// ============================================================================
// BOOKING SMS TEMPLATES - ANGLER
// ============================================================================

interface SendBookingCreatedSMSParams {
  phone: string;
  charterName: string;
  tripDate: string;
  totalPrice: string;
  userId?: string;
  bookingId?: string;
  notificationId?: string;
}

export async function sendBookingCreatedSMS(
  params: SendBookingCreatedSMSParams
) {
  const message = `Tempahan anda untuk ${params.charterName} pada ${params.tripDate} telah diterima. Jumlah: RM${params.totalPrice}. Kami akan maklumkan setelah kapten sahkan.`;
  return sendSMSViaExabytes(params.phone, message, {
    messageType: "BOOKING_CREATED",
    userId: params.userId,
    bookingId: params.bookingId,
    notificationId: params.notificationId,
  });
}

interface SendBookingApprovedSMSParams {
  phone: string;
  charterName: string;
  tripDate: string;
  userId?: string;
  bookingId?: string;
  notificationId?: string;
}

export async function sendBookingApprovedSMS(
  params: SendBookingApprovedSMSParams
) {
  const message = `Tempahan anda untuk ${params.charterName} pada ${params.tripDate} telah diluluskan. Sila buat bayaran untuk sahkan.`;
  return sendSMSViaExabytes(params.phone, message, {
    messageType: "BOOKING_APPROVED",
    userId: params.userId,
    bookingId: params.bookingId,
    notificationId: params.notificationId,
  });
}

interface SendBookingRejectedSMSParams {
  phone: string;
  charterName: string;
  reason?: string;
  userId?: string;
  bookingId?: string;
  notificationId?: string;
}

export async function sendBookingRejectedSMS(
  params: SendBookingRejectedSMSParams
) {
  const reasonText = params.reason
    ? ` Sebab: ${params.reason}`
    : " Sila semak tarikh lain yang tersedia.";
  const message = `Maaf, tempahan anda untuk ${params.charterName} telah ditolak oleh kapten.${reasonText}`;
  return sendSMSViaExabytes(params.phone, message, {
    messageType: "BOOKING_REJECTED",
    userId: params.userId,
    bookingId: params.bookingId,
    notificationId: params.notificationId,
  });
}

interface SendBookingPaidSMSParams {
  phone: string;
  charterName: string;
  tripDate: string;
  tripName?: string;
  userId?: string;
  bookingId?: string;
  notificationId?: string;
}

export async function sendBookingPaidSMS(params: SendBookingPaidSMSParams) {
  const tripInfo = params.tripName
    ? `${params.tripName} pada ${params.tripDate}`
    : params.tripDate;
  const message = `Bayaran diterima! Tempahan anda untuk ${params.charterName} (${tripInfo}) telah disahkan. Semak emel untuk butiran.`;
  return sendSMSViaExabytes(params.phone, message, {
    messageType: "BOOKING_PAID",
    userId: params.userId,
    bookingId: params.bookingId,
    notificationId: params.notificationId,
  });
}

interface SendBookingCancelledSMSParams {
  phone: string;
  charterName: string;
  tripDate: string;
  reason?: string;
  userId?: string;
  bookingId?: string;
  notificationId?: string;
}

export async function sendBookingCancelledSMS(
  params: SendBookingCancelledSMSParams
) {
  const reasonText = params.reason ? ` Sebab: ${params.reason}.` : "";
  const message = `Tempahan anda untuk ${params.charterName} pada ${params.tripDate} telah dibatalkan.${reasonText} Semak emel untuk butiran bayaran balik.`;
  return sendSMSViaExabytes(params.phone, message, {
    messageType: "BOOKING_CANCELLED",
    userId: params.userId,
    bookingId: params.bookingId,
    notificationId: params.notificationId,
  });
}

interface SendPaymentRefundedSMSParams {
  phone: string;
  charterName: string;
  refundAmount: string;
  userId?: string;
  bookingId?: string;
  notificationId?: string;
}

export async function sendPaymentRefundedSMS(
  params: SendPaymentRefundedSMSParams
) {
  const message = `Bayaran balik diproses! RM${params.refundAmount} daripada tempahan ${params.charterName} telah dikembalikan ke akaun anda.`;
  return sendSMSViaExabytes(params.phone, message, {
    messageType: "PAYMENT_REFUNDED",
    userId: params.userId,
    bookingId: params.bookingId,
    notificationId: params.notificationId,
  });
}

interface SendPaymentFailedSMSParams {
  phone: string;
  charterName: string;
  tripDate: string;
  userId?: string;
  bookingId?: string;
  notificationId?: string;
}

export async function sendPaymentFailedSMS(params: SendPaymentFailedSMSParams) {
  const message = `Bayaran untuk tempahan ${params.charterName} pada ${params.tripDate} gagal. Sila cuba lagi atau hubungi sokongan.`;
  return sendSMSViaExabytes(params.phone, message, {
    messageType: "PAYMENT_FAILED",
    userId: params.userId,
    bookingId: params.bookingId,
    notificationId: params.notificationId,
  });
}

interface SendReviewSubmittedSMSParams {
  phone: string;
  charterName: string;
  userId?: string;
  notificationId?: string;
}

export async function sendReviewSubmittedSMS(
  params: SendReviewSubmittedSMSParams
) {
  const message = `Terima kasih! Ulasan anda untuk ${params.charterName} telah dihantar dan sedang menunggu kelulusan.`;
  return sendSMSViaExabytes(params.phone, message, {
    messageType: "REVIEW_SUBMITTED",
    userId: params.userId,
    notificationId: params.notificationId,
  });
}

interface SendReviewApprovedSMSParams {
  phone: string;
  charterName: string;
  userId?: string;
  notificationId?: string;
}

export async function sendReviewApprovedSMS(
  params: SendReviewApprovedSMSParams
) {
  const message = `Ulasan anda untuk ${params.charterName} telah diluluskan dan diterbitkan!`;
  return sendSMSViaExabytes(params.phone, message, {
    messageType: "REVIEW_APPROVED",
    userId: params.userId,
    notificationId: params.notificationId,
  });
}

interface SendAccountVerifiedSMSParams {
  phone: string;
  userName?: string;
  userId?: string;
  notificationId?: string;
}

export async function sendAccountVerifiedSMS(
  params: SendAccountVerifiedSMSParams
) {
  const name = params.userName ? ` ${params.userName}` : "";
  const message = `Selamat datang${name}! Akaun anda telah disahkan. Mula terokai charter memancing sekarang!`;
  return sendSMSViaExabytes(params.phone, message, {
    messageType: "ACCOUNT_VERIFIED",
    userId: params.userId,
    notificationId: params.notificationId,
  });
}

// ============================================================================
// BOOKING SMS TEMPLATES - CAPTAIN
// ============================================================================

interface SendCaptainBookingReceivedSMSParams {
  phone: string;
  charterName: string;
  anglerName: string;
  tripDate: string;
  bookingId?: string;
}

export async function sendCaptainBookingReceivedSMS(
  params: SendCaptainBookingReceivedSMSParams
) {
  const message = `Tempahan baru! ${params.anglerName} ingin menempah ${params.charterName} pada ${params.tripDate}. Semak di dashboard anda.`;
  return sendSMSViaExabytes(params.phone, message, {
    messageType: "CAPTAIN_BOOKING_RECEIVED",
    bookingId: params.bookingId,
  });
}

interface SendCaptainBookingPaidSMSParams {
  phone: string;
  charterName: string;
  anglerName: string;
  tripDate: string;
  captainEarnings: string;
  bookingId?: string;
}

export async function sendCaptainBookingPaidSMS(
  params: SendCaptainBookingPaidSMSParams
) {
  const message = `Bayaran diterima! ${params.anglerName} sahkan ${params.charterName} pada ${params.tripDate}. Pendapatan anda: RM${params.captainEarnings}.`;
  return sendSMSViaExabytes(params.phone, message, {
    messageType: "CAPTAIN_BOOKING_PAID",
    bookingId: params.bookingId,
  });
}

interface SendCaptainBookingCancelledSMSParams {
  phone: string;
  charterName: string;
  anglerName: string;
  tripDate: string;
  bookingId?: string;
}

export async function sendCaptainBookingCancelledSMS(
  params: SendCaptainBookingCancelledSMSParams
) {
  const message = `Tempahan dibatalkan. ${params.anglerName} membatalkan tempahan untuk ${params.charterName} pada ${params.tripDate}.`;
  return sendSMSViaExabytes(params.phone, message, {
    messageType: "CAPTAIN_BOOKING_CANCELLED",
    bookingId: params.bookingId,
  });
}

// ============================================================================
// SMS LOG QUERY FUNCTIONS
// ============================================================================

/**
 * Get SMS logs with filtering and pagination
 */
export async function getSMSLogs(options: {
  userId?: string;
  phone?: string;
  messageType?: string;
  status?: "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "INVALID";
  bookingId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  cursor?: string;
}) {
  const {
    userId,
    phone,
    messageType,
    status,
    bookingId,
    startDate,
    endDate,
    limit = 50,
    cursor,
  } = options;

  const where: Record<string, unknown> = {};

  if (userId) where.userId = userId;
  if (phone) where.phone = phone;
  if (messageType) where.messageType = messageType;
  if (status) where.status = status;
  if (bookingId) where.bookingId = bookingId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  const logs = await prisma.sMSLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = logs.length > limit;
  if (hasMore) logs.pop();

  return {
    logs,
    hasMore,
    nextCursor: hasMore ? logs[logs.length - 1]?.id : undefined,
  };
}

/**
 * Get SMS statistics for monitoring dashboard
 */
export async function getSMSStats(options: {
  startDate?: Date;
  endDate?: Date;
}) {
  const { startDate, endDate } = options;

  const where: Record<string, unknown> = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  const [total, sent, failed, invalid, byType] = await Promise.all([
    prisma.sMSLog.count({ where }),
    prisma.sMSLog.count({ where: { ...where, status: "SENT" } }),
    prisma.sMSLog.count({ where: { ...where, status: "FAILED" } }),
    prisma.sMSLog.count({ where: { ...where, status: "INVALID" } }),
    prisma.sMSLog.groupBy({
      by: ["messageType"],
      where,
      _count: { id: true },
    }),
  ]);

  return {
    total,
    sent,
    failed,
    invalid,
    successRate: total > 0 ? ((sent / total) * 100).toFixed(1) : "0",
    byType: byType.map((t) => ({
      type: t.messageType,
      count: t._count.id,
    })),
  };
}
