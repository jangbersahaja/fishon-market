/**
 * Legacy Email Helper - SMTP Transport Only
 *
 * This file contains the basic SMTP transport setup.
 * It is kept for backward compatibility with auth routes that still use direct sendMail().
 *
 * NEW EMAIL SYSTEM: Use @fishon/email package via src/lib/services/email-service.ts
 *
 * Migration Date: October 28, 2025
 * Package: @fishon/email (git+https://github.com/jangbersahaja/fishon-email)
 *
 * Note: Email template functions have been removed - use @fishon/email package instead.
 */

import nodemailer from "nodemailer";

export type MailInput = {
  to: string;
  subject: string;
  html: string;
};

let transporter: any | null = null;

function getTransporter(): any {
  if (transporter) return transporter;
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
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Connection pooling for better performance
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Reduce connection timeout
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000, // 5 seconds
  });
  // In development, optionally verify the transporter to surface config errors early
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.EMAIL_VERIFY_AT_START
  ) {
    transporter
      .verify()
      .then(() => {
        console.info("[email] SMTP transporter verified (dev)");
      })
      .catch((err: unknown) => {
        console.error("[email] SMTP transporter verify failed", err);
      });
  }
  return transporter;
}

/**
 * Send email using SMTP transport.
 * Used by auth routes and email-service.ts as a low-level transport.
 *
 * For booking/notification emails, use email-service.ts functions instead.
 */
export async function sendMail({ to, subject, html }: MailInput) {
  const from = process.env.SMTP_USER!;
  const t = getTransporter();
  try {
    const info = await t.sendMail({ from, to, subject, html });
    if (process.env.NODE_ENV !== "production") {
      console.info("[email] sent", { to, subject, messageId: info?.messageId });
    }
    return info;
  } catch (err) {
    console.error("[email] send failed", { to, subject, err });
    throw err;
  }
}
