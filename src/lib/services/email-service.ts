/**
 * Email Service - @fishon/email Integration
 *
 * This service uses the new @fishon/email package with React Email templates.
 * Replaces legacy email templates from src/lib/helpers/email.ts
 *
 * Migration Date: October 28, 2025
 * Package: @fishon/email (git+https://github.com/jangbersahaja/fishon-email)
 */

import { sendMail } from "@/lib/helpers/email";
import {
  renderBookingApprovedEmail,
  renderBookingCancelledEmail,
  renderBookingConfirmedAnglerEmail,
  renderBookingConfirmedCaptainEmail,
  renderBookingCreatedEmail,
  renderBookingReceivedCaptainEmail,
  renderBookingRejectedEmail,
  renderPasswordChangedEmail,
  renderVerificationCodeEmail,
  renderWelcomeEmail,
} from "@fishon/email";

// ============================================================================
// BOOKING EMAILS
// ============================================================================

interface SendBookingCreatedParams {
  to: string;
  userName: string;
  charterName: string;
  tripName: string;
  tripDate: string;
  tripDays: number;
  durationHours: number;
  startTime?: string;
  totalPrice: string;
  confirmationUrl: string;
  paymentFlow?: "TOKENIZED" | "DIRECT"; // NEW: payment flow type
}

export async function sendBookingCreatedEmail(
  params: SendBookingCreatedParams
) {
  const html = await renderBookingCreatedEmail({
    userName: params.userName,
    charterName: params.charterName,
    tripName: params.tripName,
    tripDate: params.tripDate,
    tripDays: params.tripDays,
    durationHours: params.durationHours,
    startTime: params.startTime,
    totalPrice: params.totalPrice,
    confirmationUrl: params.confirmationUrl,
    paymentFlow: params.paymentFlow,
  });

  return sendMail({
    to: params.to,
    subject: `Booking Request Received - ${params.charterName}`,
    html,
  });
}

interface SendBookingApprovedParams {
  to: string;
  userName: string;
  charterName: string;
  tripDate: string;
  paymentUrl: string;
  confirmationUrl: string;
}

export async function sendBookingApprovedEmail(
  params: SendBookingApprovedParams
) {
  const html = await renderBookingApprovedEmail({
    userName: params.userName,
    charterName: params.charterName,
    tripDate: params.tripDate,
    paymentUrl: params.paymentUrl,
    confirmationUrl: params.confirmationUrl,
  });

  return sendMail({
    to: params.to,
    subject: `Booking Approved - ${params.charterName}`,
    html,
  });
}

interface SendBookingRejectedParams {
  to: string;
  userName: string;
  charterName: string;
  reason?: string;
  searchUrl: string;
  paymentFlow?: "TOKENIZED" | "DIRECT"; // NEW: payment flow type
  refundAmount?: string; // For DIRECT flow
}

export async function sendBookingRejectedEmail(
  params: SendBookingRejectedParams
) {
  const html = await renderBookingRejectedEmail({
    userName: params.userName,
    charterName: params.charterName,
    reason: params.reason,
    searchUrl: params.searchUrl,
    paymentFlow: params.paymentFlow,
    refundAmount: params.refundAmount,
  });

  return sendMail({
    to: params.to,
    subject: `Booking Update - ${params.charterName}`,
    html,
  });
}

interface SendBookingCancelledParams {
  to: string;
  captainName: string;
  charterName: string;
  anglerName: string;
  tripName: string;
  tripDate: string;
  cancellationReason?: string;
  bookingUrl: string;
}

export async function sendBookingCancelledEmail(
  params: SendBookingCancelledParams
) {
  const html = await renderBookingCancelledEmail({
    captainName: params.captainName,
    charterName: params.charterName,
    anglerName: params.anglerName,
    tripName: params.tripName,
    tripDate: params.tripDate,
    cancellationReason: params.cancellationReason,
    bookingUrl: params.bookingUrl,
  });

  return sendMail({
    to: params.to,
    subject: `Booking Cancelled - ${params.charterName}`,
    html,
  });
}

interface SendBookingConfirmedAnglerParams {
  to: string;
  userName: string;
  charterName: string;
  tripName: string;
  tripDate: string;
  tripDays: number;
  durationHours: number;
  startTime?: string;
  finalPrice: string;
  captainName: string;
  captainEmail: string;
  captainPhone: string;
  bookingUrl: string;
}

export async function sendBookingConfirmedAnglerEmail(
  params: SendBookingConfirmedAnglerParams
) {
  const html = await renderBookingConfirmedAnglerEmail({
    userName: params.userName,
    charterName: params.charterName,
    tripName: params.tripName,
    tripDate: params.tripDate,
    tripDays: params.tripDays,
    durationHours: params.durationHours,
    startTime: params.startTime,
    finalPrice: params.finalPrice,
    captainName: params.captainName,
    captainEmail: params.captainEmail,
    captainPhone: params.captainPhone,
    bookingUrl: params.bookingUrl,
  });

  return sendMail({
    to: params.to,
    subject: `Booking Confirmed - ${params.charterName}`,
    html,
  });
}

// ============================================================================
// CAPTAIN BOOKING EMAILS
// ============================================================================

interface SendBookingReceivedCaptainParams {
  to: string;
  captainName: string;
  charterName: string;
  anglerName: string;
  tripName: string;
  tripDate: string;
  tripDays: number;
  durationHours: number;
  startTime?: string;
  totalPrice: string;
  bookingUrl: string;
}

export async function sendBookingReceivedCaptainEmail(
  params: SendBookingReceivedCaptainParams
) {
  const html = await renderBookingReceivedCaptainEmail({
    captainName: params.captainName,
    charterName: params.charterName,
    anglerName: params.anglerName,
    tripName: params.tripName,
    tripDate: params.tripDate,
    tripDays: params.tripDays,
    durationHours: params.durationHours,
    startTime: params.startTime,
    totalPrice: params.totalPrice,
    bookingUrl: params.bookingUrl,
  });

  return sendMail({
    to: params.to,
    subject: `New Booking Request - ${params.charterName}`,
    html,
  });
}

interface SendBookingConfirmedCaptainParams {
  to: string;
  captainName: string;
  charterName: string;
  tripName: string;
  tripDate: string;
  tripDays: number;
  durationHours: number;
  startTime?: string;
  finalPrice: string;
  anglerName: string;
  anglerEmail: string;
  anglerPhone: string;
  bookingUrl: string;
  // Pricing breakdown
  subtotal?: string;
  platformFee?: string;
  captainEarnings?: string;
  paymentFlow?: "TOKENIZED" | "DIRECT";
}

export async function sendBookingConfirmedCaptainEmail(
  params: SendBookingConfirmedCaptainParams
) {
  const html = await renderBookingConfirmedCaptainEmail({
    captainName: params.captainName,
    charterName: params.charterName,
    tripName: params.tripName,
    tripDate: params.tripDate,
    tripDays: params.tripDays,
    durationHours: params.durationHours,
    startTime: params.startTime,
    finalPrice: params.finalPrice,
    anglerName: params.anglerName,
    anglerEmail: params.anglerEmail,
    anglerPhone: params.anglerPhone,
    bookingUrl: params.bookingUrl,
    subtotal: params.subtotal,
    platformFee: params.platformFee,
    captainEarnings: params.captainEarnings,
    paymentFlow: params.paymentFlow,
  });

  return sendMail({
    to: params.to,
    subject: `Payment Received - ${params.charterName}`,
    html,
  });
}

// ============================================================================
// VERIFICATION & AUTH EMAILS
// ============================================================================

interface SendVerificationCodeParams {
  to: string;
  userName?: string;
  code: string;
  purpose: "registration" | "login" | "forgot_password" | "guest_booking";
  expiryMinutes?: number;
}

export async function sendVerificationCode(params: SendVerificationCodeParams) {
  const html = await renderVerificationCodeEmail({
    userName: params.userName,
    code: params.code,
    purpose: params.purpose,
    expiryMinutes: params.expiryMinutes || 2,
  });

  const subjects = {
    registration: "Your Fishon Verification Code",
    login: "Your Fishon Login Code",
    forgot_password: "Reset Your Fishon Password",
    guest_booking: "Verify Your Booking",
  };

  return sendMail({
    to: params.to,
    subject: subjects[params.purpose],
    html,
  });
}

interface SendWelcomeParams {
  to: string;
  userName: string;
  loginUrl: string;
  promoCode?: string; // NEW: Optional promo code for welcome bonus
}

export async function sendWelcomeEmail(params: SendWelcomeParams) {
  const html = await renderWelcomeEmail({
    userName: params.userName,
    userType: "angler",
    loginUrl: params.loginUrl,
    promoCode: params.promoCode, // Pass promo code to template
  });

  return sendMail({
    to: params.to,
    subject: "Welcome to Fishon!",
    html,
  });
}

interface SendPasswordChangedParams {
  to: string;
  userName: string;
  changeType: "reset" | "changed";
  timestamp: string;
}

export async function sendPasswordChangedEmail(
  params: SendPasswordChangedParams
) {
  const html = await renderPasswordChangedEmail({
    userName: params.userName,
    changeType: params.changeType,
    timestamp: params.timestamp,
    supportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/contact`,
  });

  const subject =
    params.changeType === "reset"
      ? "Your Fishon Password Was Reset"
      : "Your Fishon Password Was Changed";

  return sendMail({
    to: params.to,
    subject,
    html,
  });
}
