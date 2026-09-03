/**
 * Email Helper - Resend (Primary) + SMTP (Fallback)
 *
 * This file provides email transport with automatic fallback:
 * 1. Resend API (HTTP-based, works reliably on Vercel serverless)
 * 2. SMTP via Nodemailer (fallback if Resend is not configured or fails)
 *
 * NEW EMAIL SYSTEM: Use @fishon/email package via src/lib/services/email-service.ts
 *
 * Migration Date: October 28, 2025
 * Package: @fishon/email (git+https://github.com/jangbersahaja/fishon-email)
 *
 * Updated: November 29, 2025
 * - Added Resend as primary transport (HTTP API, no SMTP connection issues)
 * - SMTP kept as fallback with increased timeouts
 * - Retry logic with exponential backoff for transient failures
 * - Database logging for all email attempts (success/failure)
 */

import {
  logEmailFailure,
  logEmailSuccess,
} from "@/lib/services/email-log-service";
import type { EmailType } from "@prisma/client";
import nodemailer from "nodemailer";
import { Resend } from "resend";

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  bcc?: string;
};

export type MailInputWithContext = MailInput & {
  emailType?: EmailType;
  userId?: string;
  bookingId?: string;
};

// Resend client (lazy initialized)
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Send email via Resend API (HTTP-based, reliable on serverless)
 */
async function sendViaResend({
  to,
  subject,
  html,
  bcc,
}: MailInput): Promise<{ success: true; messageId: string }> {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("Resend not configured");
  }

  const from = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER;
  if (!from) {
    throw new Error(
      "No from email configured (RESEND_FROM_EMAIL or SMTP_USER)"
    );
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    ...(bcc && { bcc }),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return { success: true, messageId: data?.id || "unknown" };
}

// Don't cache transporter in serverless - each invocation may be a new container
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure =
    String(process.env.SMTP_SECURE || "true").toLowerCase() === "true";
  const user = process.env.SMTP_USER;
  // Support both SMTP_PASS and SMTP_PASSWORD for convenience
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) {
    throw new Error("SMTP not configured. Missing SMTP_HOST/USER/PASS");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Disable pooling for serverless (each function invocation is isolated)
    pool: false,
    // Increased timeouts for Vercel serverless cold starts
    // Vercel functions can take 5-10s to cold start, SMTP handshake needs time after that
    connectionTimeout: 30000, // 30 seconds (was 10s)
    greetingTimeout: 15000, // 15 seconds (was 5s)
    socketTimeout: 60000, // 60 seconds for socket operations
    // DNS resolution timeout
    dnsTimeout: 10000, // 10 seconds
  });
}

/**
 * Helper to wait for a specified time (for retry backoff)
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (transient network issues)
 */
function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    // Retry on connection timeouts, resets, and temporary failures
    return [
      "ETIMEDOUT",
      "ECONNRESET",
      "ECONNREFUSED",
      "ENETUNREACH",
      "EHOSTUNREACH",
      "ESOCKET",
      "ENOTFOUND",
    ].includes(code || "");
  }
  return false;
}

/**
 * Send email via SMTP with retry logic (fallback transport)
 */
async function sendViaSMTP({ to, subject, html, bcc }: MailInput) {
  const from = process.env.SMTP_USER!;
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create fresh transporter for each attempt (serverless best practice)
      const transporter = createTransporter();
      const info = await transporter.sendMail({ from, to, subject, html, ...(bcc && { bcc }) });

      console.info("[email] sent via SMTP", {
        to,
        subject,
        messageId: info?.messageId,
        attempt,
      });
      return info;
    } catch (err) {
      lastError = err;
      console.error("[email] SMTP send failed", {
        to,
        subject,
        err,
        attempt,
        maxRetries,
        willRetry: attempt < maxRetries && isRetryableError(err),
      });

      // Only retry on transient connection errors
      if (attempt < maxRetries && isRetryableError(err)) {
        // Exponential backoff: 2s, 4s, 8s...
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.info(`[email] retrying SMTP in ${backoffMs}ms...`);
        await sleep(backoffMs);
      } else {
        // Non-retryable error or max retries reached
        break;
      }
    }
  }

  throw lastError;
}

/**
 * Send email using Resend (primary) with SMTP fallback.
 * Used by auth routes and email-service.ts as a low-level transport.
 *
 * For booking/notification emails, use email-service.ts functions instead.
 *
 * Transport priority:
 * 1. Resend API (HTTP-based, works reliably on Vercel serverless)
 * 2. SMTP via Nodemailer (fallback if Resend fails or not configured)
 *
 * All email attempts are logged to the database for monitoring.
 */
export async function sendMail({
  to,
  subject,
  html,
  bcc,
  emailType,
  userId,
  bookingId,
}: MailInputWithContext) {
  const resend = getResendClient();
  let usedFallback = false;
  let resendError: Error | null = null;

  // Try Resend first if configured
  if (resend) {
    try {
      const result = await sendViaResend({ to, subject, html, bcc });
      console.info("[email] sent via Resend", {
        to,
        subject,
        messageId: result.messageId,
      });

      // Log success to database (async, don't block)
      logEmailSuccess({
        to,
        subject,
        emailType,
        provider: "RESEND",
        messageId: result.messageId,
        usedFallback: false,
        userId,
        bookingId,
      }).catch((err) =>
        console.error("[email-log] Failed to log success:", err)
      );

      return result;
    } catch (err) {
      resendError = err instanceof Error ? err : new Error(String(err));
      console.warn("[email] Resend failed, falling back to SMTP", {
        to,
        subject,
        error: resendError.message,
      });
      usedFallback = true;
      // Fall through to SMTP
    }
  }

  // Fallback to SMTP
  try {
    const result = await sendViaSMTP({ to, subject, html, bcc });

    // Log success with fallback info
    logEmailSuccess({
      to,
      subject,
      emailType,
      provider: "SMTP",
      messageId: result?.messageId || "unknown",
      usedFallback,
      userId,
      bookingId,
    }).catch((err) => console.error("[email-log] Failed to log success:", err));

    return result;
  } catch (smtpError) {
    const error =
      smtpError instanceof Error ? smtpError : new Error(String(smtpError));
    const errorCode = (error as NodeJS.ErrnoException).code;

    // Log failure to database
    logEmailFailure({
      to,
      subject,
      emailType,
      provider: usedFallback ? "SMTP" : resend ? "RESEND" : "SMTP",
      errorCode: errorCode || undefined,
      errorMessage: resendError
        ? `Resend: ${resendError.message}, SMTP: ${error.message}`
        : error.message,
      usedFallback,
      userId,
      bookingId,
    }).catch((err) => console.error("[email-log] Failed to log failure:", err));

    throw smtpError;
  }
}
