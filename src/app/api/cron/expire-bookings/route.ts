/**
 * Expire Bookings Cron Job
 *
 * Handles automatic expiration of bookings that have passed their expiresAt deadline.
 * Should be called periodically (e.g., every 15 minutes) via Vercel Cron or similar.
 *
 * Actions:
 * - PAYMENT_PENDING + TOKENIZED: Release card token (no charge)
 * - PAYMENT_PENDING + DIRECT: Initiate FULL refund (already charged)
 * - Send notifications to anglers about expiration
 *
 * Usage:
 * - Vercel Cron: Configure in vercel.json
 * - Manual trigger: POST /api/cron/expire-bookings with CRON_SECRET header
 */

import { trackEvent } from "@/lib/analytics-service";
import { prisma } from "@/lib/database/prisma";
import { releasePayment } from "@/lib/payment/payment-gateway";
import { createNotification } from "@/lib/services/notification-service";
import { initiateRefund } from "@/lib/services/refund-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { NextResponse } from "next/server";

export const maxDuration = 60; // Allow up to 60 seconds for batch processing

/**
 * POST /api/cron/expire-bookings
 *
 * Protected by CRON_SECRET environment variable
 */
export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[EXPIRE_CRON] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Cron job not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error("[EXPIRE_CRON] Invalid authorization header");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[EXPIRE_CRON] Starting expiration check...");

  try {
    // Find all expired PAYMENT_AUTHORIZED bookings
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: "PAYMENT_AUTHORIZED",
        expiresAt: {
          lt: new Date(), // Expired (expiresAt in the past)
        },
      },
      select: {
        id: true,
        userId: true,
        tripId: true,
        charterId: true,
        finalPrice: true,
        paymentMethod: true,
        paymentFlow: true,
        paymentIntentId: true,
        expiresAt: true,
        date: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      take: 50, // Process in batches to avoid timeout
    });

    console.log(
      `[EXPIRE_CRON] Found ${expiredBookings.length} expired bookings`
    );

    if (expiredBookings.length === 0) {
      return NextResponse.json({
        ok: true,
        expired: 0,
        message: "No expired bookings found",
      });
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    // Process each expired booking
    for (const booking of expiredBookings) {
      try {
        console.log(`[EXPIRE_CRON] Processing booking ${booking.id}...`);

        let paymentAction = "none";
        let refundTransactionId: string | null = null;

        // Handle payment based on flow
        if (booking.paymentFlow === "TOKENIZED" && booking.paymentIntentId) {
          // Release card token (no charge occurred)
          await releasePayment(booking.paymentIntentId);
          paymentAction = "token_released";

          console.log(`[EXPIRE_CRON] Released token for booking ${booking.id}`);

          // Track analytics
          await trackEvent({
            eventType: "PAYMENT_RELEASED",
            userId: booking.userId || undefined,
            charterId: booking.charterId,
            metadata: {
              bookingId: booking.id,
              paymentMethod: booking.paymentMethod || undefined,
              paymentFlow: booking.paymentFlow || undefined,
              reason: "EXPIRED",
            },
          });
        } else if (booking.paymentFlow === "DIRECT") {
          // DIRECT flow: Payment already captured, need to refund
          const refundResult = await initiateRefund({
            bookingId: booking.id,
            reason: "AUTHORIZATION_EXPIRED",
            refundType: "FULL",
            notes: "Booking expired without captain approval",
          });

          refundTransactionId = refundResult.bookingId;
          paymentAction = "refund_initiated";

          console.log(
            `[EXPIRE_CRON] Initiated refund for booking ${booking.id}`
          );

          // Track analytics
          await trackEvent({
            eventType: "PAYMENT_REFUNDED",
            userId: booking.userId || undefined,
            charterId: booking.charterId,
            metadata: {
              bookingId: booking.id,
              paymentMethod: booking.paymentMethod || undefined,
              paymentFlow: booking.paymentFlow || undefined,
              refundAmount: Number(booking.finalPrice),
              refundPercentage: 100,
              reason: "EXPIRED",
            },
          });
        }

        // Update booking status to REJECTED
        const updateData: any = {
          status: "REJECTED",
          rejectionReason:
            "Booking expired - captain did not respond within 12 hours",
          captainDecisionAt: new Date(),
        };

        if (paymentAction === "token_released") {
          updateData.paymentReleasedAt = new Date();
        } else if (paymentAction === "refund_initiated") {
          updateData.refundStatus = "PENDING";
          updateData.refundAmount = Number(booking.finalPrice);
          updateData.refundTransactionId = refundTransactionId;
          updateData.refundReason = "Authorization expired";
        }

        await prisma.booking.update({
          where: { id: booking.id },
          data: updateData,
        });

        console.log(`[EXPIRE_CRON] Updated booking ${booking.id} to REJECTED`);

        // Send notification to angler (non-blocking)
        (async () => {
          try {
            if (!booking.userId) return;

            const trip = await getTripById(booking.tripId);
            if (!trip) return;

            let message = `Your booking for ${trip.charter.name} has expired as the captain did not respond within 12 hours.`;

            if (paymentAction === "token_released") {
              message += " Your card was not charged.";
            } else if (paymentAction === "refund_initiated") {
              message += ` A full refund of RM${Number(booking.finalPrice).toFixed(2)} will be processed within 3-5 business days.`;
            }

            await createNotification({
              userId: booking.userId,
              type: "BOOKING_REJECTED",
              title: "Booking Expired",
              message,
              actionUrl: "/search",
              actionLabel: "Find Another Charter",
              bookingId: booking.id,
              charterId: booking.charterId,
              metadata: {
                charterName: trip.charter.name,
                tripDate: booking.date.toISOString().slice(0, 10),
                reason: "expired",
                paymentAction,
              },
            });
          } catch (err) {
            console.error(
              `[EXPIRE_CRON] Failed to send notification for ${booking.id}:`,
              err
            );
          }
        })();

        // Notify captain app (non-blocking)
        (async () => {
          try {
            const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
            const hookSecret = process.env.CAPTAIN_API_SECRET;

            if (hookUrl && hookSecret) {
              const payload = {
                type: "booking.expired",
                booking: {
                  id: booking.id,
                  tripId: booking.tripId,
                  charterId: booking.charterId,
                  status: "REJECTED",
                  expiresAt: booking.expiresAt.toISOString(),
                  paymentFlow: booking.paymentFlow || undefined,
                  paymentAction,
                },
              };

              sendWithRetry(hookUrl, payload, {
                headers: { "x-captain-secret": hookSecret },
                attempts: 3,
                baseDelayMs: 300,
              });
            }
          } catch (err) {
            console.error(
              `[EXPIRE_CRON] Failed to send webhook for ${booking.id}:`,
              err
            );
          }
        })();

        results.success.push(booking.id);
      } catch (error) {
        console.error(
          `[EXPIRE_CRON] Failed to process booking ${booking.id}:`,
          error
        );
        results.failed.push({
          id: booking.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(
      `[EXPIRE_CRON] Completed: ${results.success.length} success, ${results.failed.length} failed`
    );

    return NextResponse.json({
      ok: true,
      expired: expiredBookings.length,
      success: results.success.length,
      failed: results.failed.length,
      failures: results.failed.length > 0 ? results.failed : undefined,
    });
  } catch (error) {
    console.error("[EXPIRE_CRON] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Failed to process expired bookings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/expire-bookings
 *
 * Returns count of expired bookings (for monitoring)
 */
export async function GET() {
  try {
    const count = await prisma.booking.count({
      where: {
        status: "PAYMENT_AUTHORIZED",
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      expiredCount: count,
    });
  } catch (error) {
    console.error("[EXPIRE_CRON] Failed to count expired bookings:", error);
    return NextResponse.json(
      { error: "Failed to count expired bookings" },
      { status: 500 }
    );
  }
}
