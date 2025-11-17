/**
 * ⚠️ LEGACY EMAIL SYSTEM - DEPRECATED ⚠️
 *
 * This file contains the OLD email system with inline HTML templates.
 * It is kept for backward compatibility during migration only.
 *
 * NEW EMAIL SYSTEM: Use @fishon/email package instead
 * Location: src/lib/services/email-service.ts
 *
 * Migration Date: October 28, 2025
 * Package: @fishon/email (git+https://github.com/jangbersahaja/fishon-email)
 *
 * DO NOT ADD NEW EMAIL FUNCTIONS HERE - use the new email service instead.
 *
 * @deprecated Use src/lib/services/email-service.ts with @fishon/email package
 */

import nodemailer from "nodemailer";

export type MailInput = {
  to: string;
  subject: string;
  html: string;
};

let transporter: any | null = null;

/**
 * @deprecated Use email-service.ts - this is legacy SMTP setup
 */
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
 * @deprecated Use email-service.ts sendBookingCreatedEmail() with @fishon/email package
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

/**
 * @deprecated Use email-service.ts renderBookingCreatedEmail() with @fishon/email package
 * This function generates inline HTML strings - the new system uses React Email components
 */
export function renderBookingCreatedEmail(params: {
  toName?: string;
  charterName: string;
  date: string;
  days: number;
  total: number;
  startTime?: string | null;
  confirmationUrl: string;
}) {
  const { toName, charterName, date, days, total, startTime, confirmationUrl } =
    params;
  return `
  <div>
    <p>Hi ${toName ?? "there"},</p>
    <p>Your booking request for <strong>${charterName}</strong> was received.</p>
    <ul>
      <li>Date: ${date}</li>
      <li>Days: ${days}</li>
      ${startTime ? `<li>Start time: ${startTime}</li>` : ""}
      <li>Total: RM ${total}</li>
    </ul>
    <p>You can view your booking here: <a href="${confirmationUrl}">${confirmationUrl}</a></p>
    <p>We will notify you once the captain approves your booking.</p>
  </div>`;
}

/**
 * @deprecated Use email-service.ts sendBookingApprovedEmail() or sendBookingRejectedEmail()
 * This function generates inline HTML strings - the new system uses React Email components
 */
export function renderStatusEmail(params: {
  toName?: string;
  charterName: string;
  status: "APPROVED" | "REJECTED";
  paymentUrl?: string;
  confirmationUrl: string;
}) {
  const { toName, charterName, status, paymentUrl, confirmationUrl } = params;
  const isApproved = status === "APPROVED";
  return `
  <div>
    <p>Hi ${toName ?? "there"},</p>
    <p>Your booking for <strong>${charterName}</strong> was ${status.toLowerCase()}.</p>
    ${
      isApproved && paymentUrl
        ? `<p>Please complete payment: <a href="${paymentUrl}">${paymentUrl}</a></p>`
        : ""
    }
    <p>View booking: <a href="${confirmationUrl}">${confirmationUrl}</a></p>
  </div>`;
}
