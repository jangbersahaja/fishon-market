/**
 * Payment Callback Route - Senang Pay Return Callback
 *
 * This endpoint handles payment confirmations from Senang Pay for DIRECT flow payments (FPX/E-wallet).
 * Called after angler completes payment on Senang Pay's gateway.
 *
 * CRITICAL: This must verify hash before trusting payment data to prevent fraud.
 *
 * Flow:
 * 1. Angler redirects to Senang Pay → completes FPX/E-wallet payment
 * 2. Senang Pay POSTs callback here with status_id, order_id, transaction_id, msg, hash
 * 3. Verify hash authenticity
 * 4. Update booking to PAID status with transaction ID
 * 5. Redirect angler to confirmation page
 */

import { trackEvent } from "@/lib/analytics-service";
import { prisma } from "@/lib/database/prisma";
import {
  getMerchantId,
  getSecretKey,
  verifyReturnHash,
} from "@/lib/payment/senangpay";
import {
  sendBookingCreatedEmail,
  sendBookingReceivedCaptainEmail,
} from "@/lib/services/email-service";
import { createNotification } from "@/lib/services/notification-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/payment/callback
 *
 * Senang Pay return callback (can be GET or POST depending on configuration)
 * Query params: status_id, order_id, transaction_id, msg, hash
 */
export async function GET(req: NextRequest) {
  return handleCallback(req);
}

/**
 * POST /api/payment/callback
 *
 * Senang Pay return callback (can be GET or POST depending on configuration)
 * Body params: status_id, order_id, transaction_id, msg, hash
 */
export async function POST(req: NextRequest) {
  return handleCallback(req);
}

async function handleCallback(req: NextRequest) {
  try {
    // Parse payment response from query params or body
    const isPost = req.method === "POST";
    let statusId: string | null = null;
    let orderId: string | null = null;
    let transactionId: string | null = null;
    let msg: string | null = null;
    let hash: string | null = null;

    if (isPost) {
      const body = await req.json().catch(() => ({}));
      statusId = body.status_id;
      orderId = body.order_id;
      transactionId = body.transaction_id;
      msg = body.msg;
      hash = body.hash;
    } else {
      const searchParams = req.nextUrl.searchParams;
      statusId = searchParams.get("status_id");
      orderId = searchParams.get("order_id");
      transactionId = searchParams.get("transaction_id");
      msg = searchParams.get("msg");
      hash = searchParams.get("hash");
    }

    // Validate required params
    if (!statusId || !orderId || !transactionId || !msg || !hash) {
      console.error("❌ Payment callback missing params:", {
        statusId,
        orderId,
        transactionId,
        msg,
        hash,
      });
      return redirectToError("Missing payment parameters");
    }

    // Get credentials
    const secretKey = getSecretKey();
    const merchantId = getMerchantId();
    if (!secretKey || !merchantId) {
      console.error("❌ Payment gateway not configured");
      return redirectToError("Payment gateway configuration error");
    }

    // CRITICAL: Verify hash authenticity
    const isValid = verifyReturnHash(
      {
        status_id: statusId,
        order_id: orderId,
        transaction_id: transactionId,
        msg: msg,
        hash: hash,
      },
      secretKey,
      merchantId
    );

    if (!isValid) {
      console.error("❌ Invalid payment hash - possible tampering:", {
        orderId,
        receivedHash: hash,
      });
      return redirectToError("Invalid payment verification");
    }

    // Check payment status
    const isSuccess = statusId === "1";
    if (!isSuccess) {
      console.warn("⚠️ Payment failed:", { orderId, statusId, msg });
      return redirectToError(`Payment failed: ${msg}`);
    }

    // Find pending booking by order ID
    // Order ID format: "booking-{bookingId}"
    const bookingId = orderId.replace("booking-", "");
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!booking) {
      console.error("❌ Booking not found:", bookingId);
      return redirectToError("Booking not found");
    }

    // Prevent duplicate processing (idempotency check)
    if (
      booking.status === "PAID" &&
      booking.paymentTransactionId === transactionId
    ) {
      console.log("✅ Payment already processed (idempotent):", bookingId);
      return redirectToSuccess(bookingId);
    }

    // Validate booking flow
    if (booking.paymentFlow !== "DIRECT") {
      console.error("❌ Invalid payment flow for callback:", {
        bookingId,
        flow: booking.paymentFlow,
      });
      return redirectToError("Invalid payment flow");
    }

    // Update booking to PAID status
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "PAID",
        paymentTransactionId: transactionId,
        paymentCapturedAt: new Date(),
      },
    });

    console.log("✅ Payment processed successfully:", {
      bookingId,
      transactionId,
      flow: "DIRECT",
    });

    // Fetch trip and charter data for emails/notifications
    const { getTripById } = await import("@/lib/services/trip-service");
    const trip = await getTripById(booking.tripId);
    if (!trip) {
      console.error("❌ Trip not found for booking:", bookingId);
      // Still redirect to success (payment processed), but skip emails
      return redirectToSuccess(bookingId);
    }

    // Send webhook to captain app (non-blocking)
    (async () => {
      try {
        const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
        const hookSecret = process.env.CAPTAIN_API_SECRET;
        if (hookUrl && hookSecret) {
          const guests = booking.guests as { adults: number; children: number };
          const payload = {
            type: "booking.paid",
            booking: {
              id: booking.id,
              tripId: booking.tripId,
              charterId: booking.charterId,
              startTime: booking.startTime,
              date: booking.date.toISOString(),
              days: booking.days,
              adults: guests.adults,
              children: guests.children,
              tripPrice: Number(booking.tripPrice),
              finalPrice: Number(booking.finalPrice),
              paymentMethod: booking.paymentMethod,
              paymentFlow: booking.paymentFlow,
              paymentTransactionId: transactionId,
              status: "PAID",
              captainEarnings: Number(booking.captainEarnings),
            },
          };
          sendWithRetry(hookUrl, payload, {
            headers: { "x-captain-secret": hookSecret },
            attempts: 3,
            baseDelayMs: 300,
          });
        }
      } catch (err) {
        console.error("❌ Failed to send payment webhook:", err);
      }
    })();

    // Send notification to angler (non-blocking)
    if (booking.userId) {
      (async () => {
        try {
          await createNotification({
            userId: booking.userId!,
            type: "PAYMENT_CAPTURED",
            title: "Payment Received! 💳",
            message: `Your payment for ${trip.charter.name} has been received. The captain will review your booking within 12 hours.`,
            actionUrl: `/book/confirm?id=${booking.id}`,
            actionLabel: "View Booking",
            bookingId: booking.id,
            charterId: trip.charter.id,
            metadata: {
              charterName: trip.charter.name,
              tripName: trip.name,
              tripDate: booking.date.toISOString().slice(0, 10),
              transactionId,
            },
          });
        } catch (err) {
          console.error("❌ Failed to create payment notification:", err);
        }
      })();
    }

    // Send email to angler (non-blocking)
    (async () => {
      try {
        const email = booking.user?.email;
        const name = booking.user?.name || "there";
        if (!email) return;

        const base =
          process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
        const confirmationUrl = `${base}/book/confirm?id=${encodeURIComponent(booking.id)}`;

        await sendBookingCreatedEmail({
          to: email,
          userName: name,
          charterName: trip.charter.name,
          tripName: trip.name,
          tripDate: booking.date.toISOString().slice(0, 10),
          tripDays: booking.days,
          durationHours: trip.durationHours,
          startTime: booking.startTime ?? undefined,
          totalPrice: `RM ${Number(booking.finalPrice).toFixed(2)}`,
          confirmationUrl,
          paymentFlow: booking.paymentFlow as
            | "TOKENIZED"
            | "DIRECT"
            | undefined,
        });
      } catch (err) {
        console.error("Failed to send payment confirmation email:", err);
      }
    })();

    // Send email to captain (non-blocking)
    (async () => {
      try {
        const captain = trip.charter.captain;
        if (!captain?.email) return;

        const anglerName = booking.user?.name || "Guest";

        const captainBaseUrl =
          process.env.FISHON_CAPTAIN_API_URL || "http://localhost:3000";
        const bookingUrl = `${captainBaseUrl}/captain/bookings/${encodeURIComponent(booking.id)}`;

        await sendBookingReceivedCaptainEmail({
          to: captain.email,
          captainName: captain.displayName,
          charterName: trip.charter.name,
          anglerName: anglerName,
          tripName: trip.name,
          tripDate: booking.date.toISOString().slice(0, 10),
          tripDays: booking.days,
          durationHours: trip.durationHours,
          startTime: booking.startTime ?? undefined,
          totalPrice: `RM ${Number(booking.finalPrice).toFixed(2)}`,
          bookingUrl,
        });
      } catch (err) {
        console.error("Failed to send captain booking email:", err);
      }
    })();

    // Track payment success (non-blocking)
    (async () => {
      try {
        const { getCharterById } = await import(
          "@/lib/services/charter-service"
        );
        const charter = await getCharterById(trip.charter.id);
        const guests = booking.guests as { adults: number; children: number };

        await trackEvent({
          eventType: "PAYMENT_CAPTURED",
          charterId: trip.charter.id,
          ownerId: charter?.ownerId,
          userId: booking.userId ?? undefined,
          metadata: {
            bookingId: booking.id,
            paymentMethod: booking.paymentMethod,
            paymentFlow: "DIRECT",
            transactionId,
            amount: Number(booking.finalPrice),
            tripId: trip.id,
            tripName: trip.name,
            date: booking.date.toISOString().slice(0, 10),
            days: booking.days,
            adults: guests.adults,
            children: guests.children,
          },
        });
      } catch (err) {
        console.error("Failed to track payment event:", err);
      }
    })();

    // Redirect to success
    return redirectToSuccess(bookingId);
  } catch (error: any) {
    console.error("❌ Payment callback error:", error);
    return redirectToError("Payment processing error");
  }
}

/**
 * Redirect to success page with booking ID
 */
function redirectToSuccess(bookingId: string) {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
  const url = `${base}/book/confirm?id=${encodeURIComponent(bookingId)}&payment=success`;
  return NextResponse.redirect(url, { status: 302 });
}

/**
 * Redirect to error page with error message
 */
function redirectToError(message: string) {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
  const url = `${base}/book/payment-error?error=${encodeURIComponent(message)}`;
  return NextResponse.redirect(url, { status: 302 });
}
