import { prisma } from "@/lib/database/prisma";
import { verifyReturnHash } from "@/lib/payment/senangpay";
import { createNotification } from "@/lib/services/notification-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Senang Pay Callback Webhook Handler
 *
 * This is the AUTHORITATIVE payment confirmation endpoint.
 * Senang Pay sends a server-to-server POST request here after payment completion.
 *
 * CRITICAL:
 * - This is more reliable than the return URL (user may close browser)
 * - Must be idempotent (may receive multiple callbacks for same payment)
 * - Must verify hash to prevent tampering
 * - Must return "OK" to acknowledge receipt
 *
 * Security:
 * - Hash verification prevents fake payment notifications
 * - Idempotency check prevents duplicate processing
 * - All attempts logged for audit trail
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const status_id = formData.get("status_id")?.toString();
    const order_id = formData.get("order_id")?.toString();
    const transaction_id = formData.get("transaction_id")?.toString();
    const msg = formData.get("msg")?.toString();
    const hash = formData.get("hash")?.toString();

    console.log("📥 [SENANGPAY CALLBACK] Received callback", {
      status_id,
      order_id,
      transaction_id,
      msg: msg?.substring(0, 50),
      hash: hash?.substring(0, 16) + "...",
      timestamp: new Date().toISOString(),
    });

    // Validate required fields
    if (!status_id || !order_id || !transaction_id || !msg || !hash) {
      console.error("❌ [SENANGPAY CALLBACK] Missing required fields", {
        has_status_id: !!status_id,
        has_order_id: !!order_id,
        has_transaction_id: !!transaction_id,
        has_msg: !!msg,
        has_hash: !!hash,
      });
      return new NextResponse("Bad Request: Missing required fields", {
        status: 400,
      });
    }

    // Verify hash to prevent tampering
    const merchantId = process.env.SENANGPAY_MERCHANT_ID;
    const secretKey = process.env.SENANGPAY_SECRET_KEY;

    if (!merchantId || !secretKey) {
      console.error("❌ [SENANGPAY CALLBACK] Gateway not configured");
      return new NextResponse("Internal Server Error: Gateway not configured", {
        status: 500,
      });
    }

    const isValid = verifyReturnHash(
      { status_id, order_id, transaction_id, msg, hash },
      secretKey,
      merchantId
    );

    if (!isValid) {
      console.error(
        "❌ [SENANGPAY CALLBACK] Invalid hash - possible tampering",
        {
          orderId: order_id,
          receivedHash: hash.substring(0, 16) + "...",
        }
      );
      return new NextResponse("Bad Request: Invalid hash", { status: 400 });
    }

    console.log("✅ [SENANGPAY CALLBACK] Hash verified successfully");

    // Check if booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: order_id },
      select: {
        id: true,
        status: true,
        paidAt: true,
        userId: true,
        tripId: true,
        charterId: true,
        date: true,
        paymentTransactionId: true,
        guestFirstName: true,
        guestLastName: true,
      },
    });

    if (!booking) {
      console.error("❌ [SENANGPAY CALLBACK] Booking not found", {
        orderId: order_id,
      });
      return new NextResponse("Not Found: Booking not found", { status: 404 });
    }

    // IDEMPOTENCY: Check if already processed
    if (booking.status === "PAID" && booking.paidAt) {
      console.log(
        "✅ [SENANGPAY CALLBACK] Already processed (idempotent request)",
        {
          bookingId: order_id,
          transactionId: booking.paymentTransactionId,
          paidAt: booking.paidAt,
        }
      );
      return new NextResponse("OK", { status: 200 });
    }

    // Process payment based on status
    if (status_id === "1") {
      // Payment successful
      console.log("✅ [SENANGPAY CALLBACK] Processing successful payment", {
        orderId: order_id,
        transactionId: transaction_id,
        msg,
      });

      // Update booking status
      const updated = await prisma.booking.update({
        where: { id: order_id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paymentTransactionId: transaction_id,
          paymentMethod: "SENANGPAY",
          paymentNote: msg,
        },
      });

      console.log("✅ [SENANGPAY CALLBACK] Booking updated to PAID", {
        bookingId: order_id,
        transactionId: transaction_id,
      });

      // Trigger side effects (non-blocking)
      // These run asynchronously to not delay the callback response

      // 1. Notify captain via webhook
      (async () => {
        try {
          const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
          const hookSecret = process.env.CAPTAIN_API_SECRET;

          if (hookUrl && hookSecret) {
            const trip = await getTripById(updated.tripId);
            const user = updated.userId
              ? await prisma.user.findUnique({ where: { id: updated.userId } })
              : null;

            const anglerName =
              user?.name ||
              (updated.guestFirstName
                ? `${updated.guestFirstName} ${updated.guestLastName}`
                : "Angler");

            const payload = {
              type: "booking.paid",
              booking: {
                id: updated.id,
                tripId: updated.tripId,
                charterId: updated.charterId,
                status: updated.status,
                date: updated.date.toISOString(),
                anglerName,
                charterName: trip?.charter?.name || "Your charter",
              },
            };

            console.log("📤 [WEBHOOK] Sending payment webhook to captain app");
            await sendWithRetry(hookUrl, payload, {
              headers: { "x-captain-secret": hookSecret },
              attempts: 3,
              baseDelayMs: 300,
            });
            console.log("✅ [WEBHOOK] Payment webhook sent successfully");
          } else {
            console.warn(
              "⚠️ [WEBHOOK] Skipping webhook - URL or secret not configured"
            );
          }
        } catch (webhookError) {
          console.error(
            "❌ [WEBHOOK] Failed to send payment webhook:",
            webhookError
          );
        }
      })();

      // 2. Notify angler
      (async () => {
        try {
          if (!updated.userId) return;

          const trip = await getTripById(updated.tripId);
          if (!trip) return;

          await createNotification({
            userId: updated.userId,
            type: "BOOKING_PAID",
            title: "Payment Confirmed! ✅",
            message: `Your payment for ${trip.charter.name} on ${updated.date.toISOString().slice(0, 10)} has been confirmed. See you on the water!`,
            actionUrl: `/book/confirm?id=${updated.id}`,
            actionLabel: "View Confirmation",
            bookingId: updated.id,
            charterId: updated.charterId,
            metadata: {
              charterName: trip.charter.name,
              tripDate: updated.date.toISOString().slice(0, 10),
            },
          });

          console.log("✅ [NOTIFICATION] Payment notification sent to angler");
        } catch (notificationError) {
          console.error(
            "❌ [NOTIFICATION] Failed to create payment notification:",
            notificationError
          );
        }
      })();

      // Revalidate pages for fresh data
      try {
        revalidatePath("/book/confirm", "page");
        revalidatePath("/account/bookings", "page");
      } catch (revalidateError) {
        console.error(
          "❌ [REVALIDATE] Failed to revalidate paths:",
          revalidateError
        );
      }
    } else {
      // Payment failed
      console.log("❌ [SENANGPAY CALLBACK] Payment failed", {
        orderId: order_id,
        reason: msg,
      });

      await prisma.booking.update({
        where: { id: order_id },
        data: {
          paymentNote: `Payment Failed: ${msg}`,
        },
      });

      console.log("📝 [SENANGPAY CALLBACK] Payment failure note recorded");
    }

    // Return "OK" to acknowledge receipt to Senang Pay
    // This tells Senang Pay we received and processed the callback
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("❌ [SENANGPAY CALLBACK] Error processing callback:", error);
    // Still return 200 to prevent Senang Pay from retrying
    // Log the error for investigation
    return new NextResponse("OK", { status: 200 });
  }
}
