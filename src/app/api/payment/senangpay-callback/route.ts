import { prisma } from "@/lib/database/prisma";
import { triggerPaymentSideEffects } from "@/lib/payment/payment-side-effects";
import { verifyReturnHash } from "@/lib/payment/senangpay";
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
        finalPrice: true,
        paymentTransactionId: true,
        user: {
          select: {
            name: true,
          },
        },
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

      // Calculate financial breakdown
      const { prismaCaptain } = await import("@/lib/database/prisma-captain");

      const charter = await (prismaCaptain as any).charter.findUnique({
        where: { id: booking.charterId },
        select: { pricingPlan: true },
      });

      const commissionRate =
        charter?.pricingPlan === "GOLD"
          ? 0.05
          : charter?.pricingPlan === "SILVER"
            ? 0.08
            : 0.1; // BASIC

      const finalPrice = Number(booking.finalPrice);
      const platformFee = Math.round(finalPrice * commissionRate * 100) / 100;
      const captainEarnings = finalPrice - platformFee;

      // Update booking status with financial data
      const updated = await prisma.booking.update({
        where: { id: order_id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paymentTransactionId: transaction_id,
          paymentMethod: "SENANGPAY",
          paymentNote: msg,
          platformFee,
          captainEarnings,
          payoutStatus: "PENDING",
        },
      });

      console.log("✅ [SENANGPAY CALLBACK] Booking updated to PAID", {
        bookingId: order_id,
        transactionId: transaction_id,
        finalPrice,
        platformFee,
        captainEarnings,
      });

      // Trigger all payment side effects (captain webhook, angler notification, page revalidation)
      await triggerPaymentSideEffects({
        bookingId: order_id,
        source: "callback",
      });
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
