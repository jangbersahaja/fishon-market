import { trackEvent } from "@/lib/analytics-service";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { releasePayment } from "@/lib/payment/payment-gateway";
import {
  checkRateLimit,
  getClientIP,
  getRateLimitResetTime,
} from "@/lib/rateLimit";
import { sendBookingCancelledEmail } from "@/lib/services/email-service";
import { sendMessage } from "@/lib/services/message-service";
import { bookingCancelledMessage } from "@/lib/services/message-templates";
import { createNotification } from "@/lib/services/notification-service";
import {
  calculateRefundAmount,
  initiateRefund,
} from "@/lib/services/refund-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { id, email, cancellationReason } = body as {
    id?: string;
    email?: string;
    cancellationReason?: string;
  };

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Fetch booking
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      userId: true,
      tripId: true,
      charterId: true,
      finalPrice: true,
      paymentMethod: true,
      paymentFlow: true,
      paymentIntentId: true,
      paymentAuthorizedAt: true,
      paymentCapturedAt: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Check booking status - can cancel PENDING, APPROVED, PAYMENT_PENDING, or PAID
  const cancellableStatuses = [
    "PENDING",
    "APPROVED",
    "PAYMENT_PENDING",
    "PAID",
  ];
  if (!cancellableStatuses.includes(booking.status)) {
    return NextResponse.json(
      { error: "Cannot cancel booking in current status" },
      { status: 409 }
    );
  }

  // Determine booking email
  const bookingEmail = booking.user?.email;
  if (!bookingEmail) {
    return NextResponse.json(
      { error: "No email associated with this booking" },
      { status: 400 }
    );
  }

  // Authorization: Two methods
  // 1. Authenticated user owns the booking
  // 2. Email verification (guest or non-owner)

  const isAuthenticatedOwner =
    session?.user?.id && booking.userId === session.user.id;

  if (!isAuthenticatedOwner) {
    // Email verification required
    if (!email) {
      return NextResponse.json(
        { error: "Email verification required" },
        { status: 403 }
      );
    }

    // Validate email matches booking
    if (email.toLowerCase() !== bookingEmail.toLowerCase()) {
      // Rate limiting for failed attempts
      const clientIP = getClientIP(req);
      const rateLimitKey = `cancel:${id}:${clientIP}`;
      const attempts = checkRateLimit(rateLimitKey, 3600000); // 1 hour window

      if (attempts > 3) {
        const resetTime = getRateLimitResetTime(rateLimitKey);
        const minutesRemaining = Math.ceil(resetTime / 60000);
        return NextResponse.json(
          {
            error: "Too many failed attempts. Please try again later.",
            retryAfter: minutesRemaining,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "Email does not match booking email",
          attemptsRemaining: Math.max(0, 3 - attempts),
        },
        { status: 403 }
      );
    }
  }

  // Payment handling based on status and flow
  let refundAmount: number | null = null;
  let refundTransactionId: string | null = null;
  let paymentReleaseOutcome: string | null = null;

  try {
    // PAYMENT_AUTHORIZED + TOKENIZED: Release the token (no charge occurred)
    if (
      booking.status === "PAYMENT_AUTHORIZED" &&
      booking.paymentFlow === "TOKENIZED"
    ) {
      if (!booking.paymentIntentId) {
        throw new Error("Missing payment intent ID for TOKENIZED booking");
      }

      await releasePayment(booking.paymentIntentId);
      paymentReleaseOutcome = "TOKEN_RELEASED";

      // Log analytics
      await trackEvent({
        eventType: "PAYMENT_RELEASED",
        userId: booking.userId || undefined,
        charterId: booking.charterId,
        metadata: {
          bookingId: booking.id,
          paymentMethod: booking.paymentMethod || undefined,
          paymentFlow: booking.paymentFlow || undefined,
          reason: "ANGLER_CANCELLED_BEFORE_APPROVAL",
        },
      });
    }

    // PAID: Apply cancellation policy and refund
    else if (booking.status === "PAID") {
      // Get booking with trip date for refund calculation
      const bookingWithPrice = await prisma.booking.findUnique({
        where: { id: booking.id },
        select: {
          finalPrice: true,
          platformFee: true,
          date: true,
        },
      });

      if (!bookingWithPrice) {
        throw new Error("Booking not found for refund calculation");
      }

      // Calculate refund based on cancellation policy
      const refundCalculation = calculateRefundAmount(
        bookingWithPrice,
        new Date()
      );

      refundAmount = refundCalculation.refundAmount;

      // Only initiate refund if amount > 0
      if (refundAmount !== null && refundAmount > 0) {
        if (
          booking.paymentFlow === "DIRECT" ||
          booking.paymentFlow === "TOKENIZED"
        ) {
          const refundResult = await initiateRefund({
            bookingId: booking.id,
            reason: "ANGLER_CANCELLATION",
            refundType: "POLICY_BASED",
            notes: cancellationReason || "Angler-initiated cancellation",
          });

          refundTransactionId = refundResult.bookingId; // Using bookingId as transaction reference

          // Log analytics
          await trackEvent({
            eventType: "PAYMENT_REFUNDED",
            userId: booking.userId || undefined,
            charterId: booking.charterId,
            metadata: {
              bookingId: booking.id,
              paymentMethod: booking.paymentMethod || undefined,
              paymentFlow: booking.paymentFlow || undefined,
              refundAmount,
              refundPercentage: refundCalculation.refundPercentage * 100,
              daysBeforeTrip: refundCalculation.daysBeforeTrip,
              reason: "ANGLER_CANCELLATION",
            },
          });
        } else {
          console.warn(`[CANCEL] Unknown payment flow: ${booking.paymentFlow}`);
        }
      } else {
        console.log(`[CANCEL] No refund due (amount: RM${refundAmount})`);
      }
    }
  } catch (paymentError) {
    console.error("[CANCEL] Payment handling error:", paymentError);
    // Continue with cancellation but flag the payment issue
    return NextResponse.json(
      {
        error: "Cancellation failed during payment processing",
        details:
          paymentError instanceof Error
            ? paymentError.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }

  // Update booking status with payment/refund data
  const updateData: any = {
    status: "CANCELLED",
    cancellationReason: cancellationReason || null,
  };

  if (paymentReleaseOutcome) {
    updateData.paymentReleasedAt = new Date();
  }

  if (refundAmount !== null) {
    updateData.refundStatus = refundAmount > 0 ? "PENDING" : "NOT_APPLICABLE";
    updateData.refundAmount = refundAmount;
    if (refundTransactionId) {
      updateData.refundTransactionId = refundTransactionId;
    }
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      status: true,
      userId: true,
      tripId: true,
      charterId: true,
      date: true,
      cancellationReason: true,
      finalPrice: true,
      paymentFlow: true,
      refundAmount: true,
      refundStatus: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  // Notify captain app (best-effort)
  try {
    const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
    const hookSecret = process.env.CAPTAIN_API_SECRET;
    console.log("📤 [WEBHOOK] Preparing to send booking.cancelled webhook", {
      hookUrl,
      hasSecret: !!hookSecret,
      bookingId: updated.id,
      charterId: updated.charterId,
    });

    if (hookUrl && hookSecret) {
      // Fetch trip data for webhook payload
      const trip = await getTripById(updated.tripId);
      const anglerName = updated.user?.name || "Angler";

      const payload = {
        type: "booking.cancelled",
        booking: {
          id: updated.id,
          tripId: updated.tripId,
          charterId: updated.charterId,
          status: updated.status,
          date: updated.date.toISOString(),
          anglerName,
          charterName: trip?.charter?.name || "Your charter",
          paymentFlow: updated.paymentFlow || undefined,
          refundAmount: updated.refundAmount || undefined,
          refundStatus: updated.refundStatus || undefined,
        },
      };

      console.log(
        "🚀 [WEBHOOK] Sending cancellation webhook to captain app..."
      );
      sendWithRetry(hookUrl, payload, {
        headers: { "x-captain-secret": hookSecret },
        attempts: 3,
        baseDelayMs: 300,
      });
    } else {
      console.warn("⚠️ [WEBHOOK] Skipping webhook - missing URL or secret");
    }
  } catch (webhookError) {
    console.error(
      "❌ [WEBHOOK] Failed to send cancellation webhook:",
      webhookError
    );
  }

  // Send system message to conversation (Phase 2.2) (non-blocking best-effort)
  (async () => {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { bookingId: updated.id },
      });

      if (conversation) {
        const cancelledBy = booking.userId ? "angler" : undefined;
        const templateMessage = bookingCancelledMessage(
          cancelledBy,
          updated.cancellationReason ?? undefined
        );

        await sendMessage(
          conversation.id,
          "system",
          templateMessage.content,
          "system",
          {
            contentType: "system",
            systemType: templateMessage.systemType,
          }
        );

        console.log(
          "✅ Booking cancelled system message sent:",
          conversation.id
        );
      }
    } catch (err) {
      console.error("❌ Failed to send cancellation message:", err);
      // Non-critical - booking is still cancelled
    }
  })();

  // Notify angler (non-blocking best-effort)
  (async () => {
    try {
      const recipientUserId = updated.userId;
      if (!recipientUserId) return;

      const trip = await getTripById(updated.tripId);
      if (!trip) return;

      // Build refund message
      let refundMessage = "";
      if (updated.refundAmount !== null && updated.refundAmount !== undefined) {
        const refundAmountNum = Number(updated.refundAmount);
        if (refundAmountNum > 0) {
          const refundPercentage = Math.round(
            (refundAmountNum / Number(updated.finalPrice)) * 100
          );
          refundMessage = ` You will receive a ${refundPercentage}% refund (RM${refundAmountNum.toFixed(2)}) within 3-5 business days.`;
        } else {
          refundMessage =
            " No refund is available due to the cancellation policy.";
        }
      } else if (paymentReleaseOutcome === "TOKEN_RELEASED") {
        refundMessage = " Your card was not charged.";
      }

      await createNotification({
        userId: recipientUserId,
        type: "BOOKING_CANCELLED",
        title: "Booking Cancelled",
        message: `Your booking for ${trip.charter.name} on ${updated.date.toISOString().slice(0, 10)} has been cancelled.${updated.cancellationReason ? ` Reason: ${updated.cancellationReason}` : ""}${refundMessage}`,
        actionUrl: `/search`,
        actionLabel: "Find Another Charter",
        bookingId: updated.id,
        charterId: updated.charterId,
        metadata: {
          charterName: trip.charter.name,
          tripDate: updated.date.toISOString().slice(0, 10),
          cancellationReason: updated.cancellationReason ?? undefined,
          refundAmount: updated.refundAmount ?? undefined,
          refundStatus: updated.refundStatus ?? undefined,
        },
      });
    } catch (err) {
      console.error("Failed to create cancellation notification:", err);
    }
  })();

  // Email captain about cancellation (non-blocking best-effort)
  (async () => {
    try {
      // Fetch trip data to get captain info
      const trip = await getTripById(updated.tripId);
      if (!trip) return;

      const captain = trip.charter.captain;
      if (!captain?.email) {
        console.warn(
          "Captain email not available for cancellation notification:",
          updated.id
        );
        return;
      }

      const anglerName = updated.user?.name || "Angler";

      const captainBaseUrl =
        process.env.FISHON_CAPTAIN_API_URL || "http://localhost:3000";
      const bookingUrl = `${captainBaseUrl}/captain/bookings/${encodeURIComponent(
        updated.id
      )}`;

      await sendBookingCancelledEmail({
        to: captain.email,
        captainName: captain.displayName,
        charterName: trip.charter.name,
        anglerName: anglerName,
        tripName: trip.name,
        tripDate: updated.date.toISOString().slice(0, 10),
        cancellationReason: updated.cancellationReason ?? undefined,
        bookingUrl,
      });
    } catch (err) {
      console.error("Failed to send captain cancellation email:", err);
    }
  })();

  // Revalidate angler pages
  try {
    revalidatePath("/book/confirm", "page");
    revalidatePath("/account/bookings", "page");

    // Revalidate messages page if conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { bookingId: updated.id },
      select: { id: true },
    });
    if (conversation) {
      revalidatePath(`/account/messages/${conversation.id}`, "page");
    }
  } catch (error) {
    console.error("Revalidation failed:", error);
  }

  // Build user-facing message
  let message = "Booking cancelled successfully.";
  if (updated.refundAmount !== null && updated.refundAmount !== undefined) {
    const refundAmountNum = Number(updated.refundAmount);
    if (refundAmountNum > 0) {
      const refundPercentage = Math.round(
        (refundAmountNum / Number(updated.finalPrice)) * 100
      );
      message += ` You will receive a ${refundPercentage}% refund (RM${refundAmountNum.toFixed(2)}) within 3-5 business days.`;
    } else {
      message += " No refund is available due to the cancellation policy.";
    }
  } else if (paymentReleaseOutcome === "TOKEN_RELEASED") {
    message += " Your card was not charged.";
  }

  return NextResponse.json({
    ok: true,
    message,
    booking: {
      id: updated.id,
      status: updated.status,
      refundAmount: updated.refundAmount,
      refundStatus: updated.refundStatus,
    },
  });
}
