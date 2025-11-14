/**
 * Refund Service
 *
 * Handles refund processing for bookings with support for:
 * - Full refunds (captain rejection, expired authorization)
 * - Policy-based refunds (angler cancellation with time-based rules)
 * - Refund status tracking and automation
 *
 * Cancellation Policy:
 * - >30 days before trip: 80% refund (20% to captain + platform)
 * - 15-30 days before: 50% refund (50% to captain + platform)
 * - <15 days before: No refund (100% to captain + platform)
 * - Emergency cases: Manual review by staff
 */

import { prisma } from "@/lib/database/prisma";
import { createNotification } from "@/lib/services/notification-service";
import type { Decimal } from "@prisma/client/runtime/library";

export type RefundType = "FULL" | "POLICY_BASED" | "NONE" | "MANUAL";
export type RefundReason =
  | "CAPTAIN_REJECTION"
  | "ANGLER_CANCELLATION"
  | "AUTHORIZATION_EXPIRED"
  | "PAYMENT_FAILED"
  | "MANUAL_OVERRIDE";

export interface RefundCalculation {
  refundAmount: number;
  refundPercentage: number;
  captainAmount: number;
  platformAmount: number;
  daysBeforeTrip: number;
  policyApplied: string;
}

export interface InitiateRefundParams {
  bookingId: string;
  reason: RefundReason;
  refundType: RefundType;
  initiatedBy?: string; // Staff user ID for manual refunds
  notes?: string;
}

/**
 * Calculate refund amount based on cancellation policy
 *
 * @param booking - Booking object with financial details
 * @param cancelledAt - Cancellation date (defaults to now)
 * @returns Refund calculation breakdown
 */
export function calculateRefundAmount(
  booking: {
    finalPrice: Decimal;
    platformFee: Decimal | null;
    date: Date;
  },
  cancelledAt: Date = new Date()
): RefundCalculation {
  const tripDate = new Date(booking.date);
  const daysBeforeTrip = Math.floor(
    (tripDate.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const finalPrice = Number(booking.finalPrice);
  const platformFee = Number(booking.platformFee || 0);
  const captainEarnings = finalPrice - platformFee;

  let refundPercentage = 0;
  let policyApplied = "";

  if (daysBeforeTrip > 30) {
    // More than 30 days: 80% refund
    refundPercentage = 0.8;
    policyApplied = "More than 30 days before trip";
  } else if (daysBeforeTrip >= 15) {
    // 15-30 days: 50% refund
    refundPercentage = 0.5;
    policyApplied = "15-30 days before trip";
  } else if (daysBeforeTrip >= 0) {
    // Less than 15 days: No refund
    refundPercentage = 0;
    policyApplied = "Less than 15 days before trip";
  } else {
    // Trip already passed: No refund
    refundPercentage = 0;
    policyApplied = "Trip date has passed";
  }

  const refundAmount = Math.round(finalPrice * refundPercentage * 100) / 100;
  const retainedAmount = finalPrice - refundAmount;

  // Split retained amount between captain and platform (proportional to original split)
  const platformShare = platformFee > 0 ? platformFee / finalPrice : 0.1; // Default 10% if not set
  const platformAmount = Math.round(retainedAmount * platformShare * 100) / 100;
  const captainAmount = retainedAmount - platformAmount;

  return {
    refundAmount,
    refundPercentage,
    captainAmount,
    platformAmount,
    daysBeforeTrip,
    policyApplied,
  };
}

/**
 * Initiate a refund for a booking
 *
 * This function:
 * 1. Validates the booking can be refunded
 * 2. Calculates refund amount based on type and policy
 * 3. Updates booking with refund details
 * 4. Creates notification for angler
 * 5. Returns refund information for payment gateway processing
 *
 * @param params - Refund parameters
 * @returns Refund details for payment gateway processing
 */
export async function initiateRefund(params: InitiateRefundParams) {
  const { bookingId, reason, refundType, initiatedBy, notes } = params;

  // Fetch booking with financial details
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      userId: true,
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          name: true,
        },
      },
      tripId: true,
      charterId: true,
      date: true,
      finalPrice: true,
      platformFee: true,
      captainEarnings: true,
      paymentIntentId: true,
      paymentMethod: true,
      refundStatus: true,
      refundAmount: true,
      refundedAt: true,
    },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  // Check if already refunded
  if (booking.refundStatus === "COMPLETED") {
    throw new Error(`Booking ${bookingId} already refunded`);
  }

  // Check if booking can be refunded (must have payment)
  if (!booking.paymentIntentId && booking.status !== "PAID") {
    throw new Error(`Booking ${bookingId} has no payment to refund`);
  }

  // Calculate refund amount based on type
  let refundCalculation: RefundCalculation | null = null;
  let refundAmount = 0;
  let refundReasonText = "";

  switch (refundType) {
    case "FULL":
      // Full refund (captain rejection, expired auth)
      refundAmount = Number(booking.finalPrice);
      refundReasonText =
        reason === "CAPTAIN_REJECTION"
          ? "Captain declined your booking request"
          : "Authorization expired";
      break;

    case "POLICY_BASED":
      // Policy-based refund (angler cancellation)
      refundCalculation = calculateRefundAmount(booking);
      refundAmount = refundCalculation.refundAmount;
      refundReasonText = `Cancellation ${refundCalculation.daysBeforeTrip} days before trip (${refundCalculation.refundPercentage * 100}% refund)`;
      break;

    case "NONE":
      // No refund (late cancellation)
      refundAmount = 0;
      refundReasonText =
        "No refund per cancellation policy (less than 15 days)";
      break;

    case "MANUAL":
      // Manual refund (staff override)
      refundAmount = Number(booking.finalPrice); // Default to full, staff can adjust
      refundReasonText = notes || "Manual refund by staff";
      break;
  }

  // Update booking with refund details
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      refundStatus: "PENDING",
      refundAmount: refundAmount,
      refundReason: refundReasonText,
      refundedBy: initiatedBy || null,
      cancellationPolicy: refundCalculation
        ? {
            daysBeforeTrip: refundCalculation.daysBeforeTrip,
            refundPercentage: refundCalculation.refundPercentage,
            policyApplied: refundCalculation.policyApplied,
          }
        : undefined,
      // Update captain earnings if partial refund
      ...(refundCalculation && refundCalculation.captainAmount > 0
        ? {
            captainEarnings: refundCalculation.captainAmount,
          }
        : {}),
    },
    select: {
      id: true,
      userId: true,
      refundAmount: true,
      refundReason: true,
      paymentIntentId: true,
      paymentMethod: true,
    },
  });

  // Create notification for angler (if authenticated user)
  if (updatedBooking.userId) {
    try {
      await createNotification({
        userId: updatedBooking.userId,
        type: "PAYMENT_REFUNDED",
        title: refundAmount > 0 ? "Refund Processing" : "Booking Cancelled",
        message:
          refundAmount > 0
            ? `Your refund of RM${refundAmount.toFixed(2)} is being processed. It should appear in your account within 3-5 business days.`
            : refundReasonText,
        actionUrl: `/account/bookings/${bookingId}`,
        actionLabel: "View Details",
        bookingId: updatedBooking.id,
        metadata: {
          refundAmount,
          refundReason: refundReasonText,
          estimatedDays: "3-5",
        },
      });
    } catch (error) {
      console.error("Failed to create refund notification:", error);
      // Non-critical, continue with refund
    }
  }

  // Return refund details for payment gateway processing
  return {
    bookingId: updatedBooking.id,
    paymentIntentId: updatedBooking.paymentIntentId,
    paymentMethod: updatedBooking.paymentMethod,
    refundAmount,
    refundReason: refundReasonText,
    refundCalculation,
  };
}

/**
 * Process refund through payment gateway
 *
 * This function should be called AFTER initiateRefund() to:
 * 1. Call payment gateway refund API
 * 2. Update refund status based on result
 * 3. Send confirmation notification
 *
 * @param bookingId - Booking ID
 * @param transactionId - Payment gateway transaction ID (from refund API response)
 * @returns Updated booking with refund status
 */
export async function processRefund(bookingId: string, transactionId?: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      refundStatus: true,
      refundAmount: true,
    },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  if (booking.refundStatus !== "PENDING") {
    throw new Error(`Booking ${bookingId} refund is not in PENDING status`);
  }

  // Update refund status to PROCESSING
  // In production, this would be called after payment gateway API call
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      refundStatus: "PROCESSING",
      refundTransactionId: transactionId || null,
    },
    select: {
      id: true,
      userId: true,
      refundAmount: true,
      refundStatus: true,
    },
  });

  return updatedBooking;
}

/**
 * Complete refund (mark as COMPLETED after payment gateway confirms)
 *
 * @param bookingId - Booking ID
 * @param transactionId - Payment gateway transaction ID
 */
export async function completeRefund(bookingId: string, transactionId: string) {
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      refundStatus: "COMPLETED",
      refundedAt: new Date(),
      refundTransactionId: transactionId,
    },
    select: {
      id: true,
      userId: true,
      refundAmount: true,
    },
  });

  // Send confirmation notification
  if (updatedBooking.userId) {
    try {
      await createNotification({
        userId: updatedBooking.userId,
        type: "PAYMENT_REFUNDED",
        title: "Refund Completed ✓",
        message: `Your refund of RM${Number(updatedBooking.refundAmount).toFixed(2)} has been processed successfully.`,
        actionUrl: `/account/bookings/${bookingId}`,
        actionLabel: "View Booking",
        bookingId: updatedBooking.id,
        metadata: {
          refundAmount: Number(updatedBooking.refundAmount),
          completedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to create refund completion notification:", error);
    }
  }

  return updatedBooking;
}

/**
 * Fail refund (mark as FAILED after payment gateway error)
 *
 * @param bookingId - Booking ID
 * @param errorMessage - Error message from payment gateway
 */
export async function failRefund(bookingId: string, errorMessage: string) {
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      refundStatus: "FAILED",
      refundReason: `${await prisma.booking.findUnique({ where: { id: bookingId }, select: { refundReason: true } }).then((b) => b?.refundReason || "")} | Error: ${errorMessage}`,
    },
    select: {
      id: true,
      userId: true,
      refundAmount: true,
    },
  });

  // Notify staff for manual intervention
  console.error(`[REFUND FAILED] Booking ${bookingId}: ${errorMessage}`);

  return updatedBooking;
}

/**
 * Check refund status for a booking
 *
 * @param bookingId - Booking ID
 * @returns Refund status information
 */
export async function checkRefundStatus(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      refundStatus: true,
      refundAmount: true,
      refundReason: true,
      refundedAt: true,
      refundTransactionId: true,
      cancellationPolicy: true,
    },
  });

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  return {
    bookingId: booking.id,
    status: booking.refundStatus,
    amount: booking.refundAmount ? Number(booking.refundAmount) : 0,
    reason: booking.refundReason,
    completedAt: booking.refundedAt,
    transactionId: booking.refundTransactionId,
    policy: booking.cancellationPolicy as any,
  };
}
