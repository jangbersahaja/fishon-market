import { trackEvent } from "@/lib/analytics-service";
import { addDaysUTC, hasConflicts, TimeSlot } from "@/lib/booking/overlap";
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

    // Check if this is a payment session or existing booking
    const paymentSession = await prisma.paymentSession.findUnique({
      where: { id: order_id },
    });

    // If payment session exists, create booking from session data
    if (paymentSession && paymentSession.status === "PENDING") {
      if (status_id !== "1") {
        // Payment failed - mark session as failed
        await prisma.paymentSession.update({
          where: { id: order_id },
          data: { status: "FAILED" },
        });
        console.log("❌ [SENANGPAY CALLBACK] Payment failed for session", {
          sessionId: order_id,
          reason: msg,
        });
        return new NextResponse("OK", { status: 200 });
      }

      // Payment successful - create booking from session data
      const bookingData = paymentSession.bookingData as any;
      const pricingBreakdown = bookingData.pricingBreakdown;

      // Import required services
      const { getTripById } = await import("@/lib/services/trip-service");
      const trip = await getTripById(bookingData.tripId);
      if (!trip) {
        console.error("❌ [SENANGPAY CALLBACK] Trip not found", {
          tripId: bookingData.tripId,
        });
        return new NextResponse("Not Found: Trip not found", { status: 404 });
      }

      // === CONFLICT CHECK ===
      // Must verify no other booking was created for this slot while user was paying
      // This prevents double-booking when two users pay simultaneously via DIRECT flow
      const d = new Date(bookingData.date);
      const ds = bookingData.days || 1;
      const newStart = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
      );
      const newEnd = addDaysUTC(newStart, ds - 1);

      // Check for conflicting bookings (PAYMENT_AUTHORIZED or PAID status)
      const existingBookings = await prisma.booking.findMany({
        where: {
          charterId: bookingData.charterId,
          status: { in: ["PAYMENT_AUTHORIZED", "PAID"] },
          date: { gte: newStart, lte: addDaysUTC(newEnd, ds) },
        },
        select: {
          id: true,
          date: true,
          days: true,
          startTime: true,
          timeSlots: true,
        },
      });

      const newTimeSlots = bookingData.timeSlots as TimeSlot[] | undefined;
      // If startTimes exist, this charter uses time slots for availability
      const usesStartTimes =
        trip.startTimes.length > 0 && newTimeSlots && newTimeSlots.length > 0;

      const conflictDetected = hasConflicts(
        existingBookings.map((b) => ({
          date: b.date,
          days: b.days,
          startTime: b.startTime,
          timeSlots: b.timeSlots,
        })),
        newStart,
        ds,
        {
          usesStartTimes: usesStartTimes || false,
          selectedStartTime: bookingData.startTime,
          newTimeSlots,
        }
      );

      if (conflictDetected) {
        console.error("❌ [SENANGPAY CALLBACK] Date conflict detected", {
          sessionId: order_id,
          charterId: bookingData.charterId,
          date: bookingData.date,
          existingBookings: existingBookings.map((b) => b.id),
        });

        // Mark session as conflict (will need refund)
        // Store conflict reason in bookingData JSON for reference
        const updatedBookingData = {
          ...bookingData,
          conflictReason: "Date was booked by another user during payment",
          conflictDetectedAt: new Date().toISOString(),
        };

        await prisma.paymentSession.update({
          where: { id: order_id },
          data: {
            status: "CONFLICT",
            bookingData: updatedBookingData,
          },
        });

        // TODO: Trigger refund process for the customer
        // For now, log for manual refund processing
        console.warn("⚠️ [SENANGPAY CALLBACK] REFUND REQUIRED", {
          sessionId: order_id,
          transactionId: transaction_id,
          amount: pricingBreakdown.finalPrice,
        });

        return new NextResponse("OK", { status: 200 });
      }

      // Calculate expiry (24h for AUTO flow acknowledgment)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Build guests data
      const guestsData: any = {
        adults: bookingData.adults,
        children: bookingData.children,
      };
      if (bookingData.participants) {
        guestsData.participants = bookingData.participants;
      }
      if (bookingData.emergencyName && bookingData.emergencyPhone) {
        guestsData.emergencyContact = {
          name: bookingData.emergencyName,
          phone: bookingData.emergencyPhone,
          relationship: bookingData.emergencyRelation || "Not specified",
        };
      }

      // Create booking (mark promo code usage if applicable)
      const booking = await prisma.booking.create({
        data: {
          userId: paymentSession.userId!,
          tripId: bookingData.tripId,
          charterId: bookingData.charterId,
          date: new Date(bookingData.date),
          days: bookingData.days,
          startTime: bookingData.startTime,
          timeSlots: bookingData.timeSlots || null, // Include timeSlots from session
          guests: guestsData,
          tripPrice: pricingBreakdown.tripPrice,
          finalPrice: pricingBreakdown.finalPrice,
          platformFee: pricingBreakdown.platformFee,
          serviceFee: pricingBreakdown.serviceFee,
          captainEarnings: pricingBreakdown.captainEarnings,
          promoCodeId: bookingData.promoCodeId,
          discount: bookingData.promoDiscount
            ? ({
                code: bookingData.promoCode,
                amount: bookingData.promoDiscount,
              } as any)
            : null,
          expiresAt,
          status: "PAYMENT_AUTHORIZED", // Payment captured, awaiting captain acknowledgment
          paymentAuthorizedAt: new Date(),
          bookingFlowType: "AUTO",
          acknowledgmentDeadline: expiresAt,
          paymentMethod: paymentSession.paymentMethod,
          paymentFlow: "DIRECT",
          paymentTransactionId: transaction_id,
          note: bookingData.note,
        },
      });

      // Mark session as completed
      await prisma.paymentSession.update({
        where: { id: order_id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      console.log(
        "✅ [SENANGPAY CALLBACK] Booking created from payment session",
        {
          sessionId: order_id,
          bookingId: booking.id,
        }
      );

      // Create conversation for the booking (DIRECT flow)
      if (trip.charter.ownerId) {
        try {
          const { createConversation } = await import(
            "@/lib/services/message-service"
          );
          const conversation = await createConversation(
            booking.id,
            paymentSession.userId!, // anglerId
            bookingData.charterId, // charterId
            trip.charter.ownerId // ownerId (User.id of charter owner)
          );
          console.log(
            "✅ [SENANGPAY CALLBACK] Conversation created for DIRECT flow booking",
            {
              bookingId: booking.id,
              conversationId: conversation.id,
            }
          );
        } catch (convError) {
          console.error(
            "❌ [SENANGPAY CALLBACK] Failed to create conversation:",
            convError
          );
          // Non-critical - booking is still valid
        }
      } else {
        console.warn(
          "⚠️ [SENANGPAY CALLBACK] Skipping conversation creation - charter owner not found"
        );
      }

      // Track PAYMENT_AUTHORIZED for DIRECT flow (non-blocking)
      (async () => {
        try {
          const guests = bookingData.guests as {
            adults: number;
            children: number;
          };
          await trackEvent({
            eventType: "PAYMENT_AUTHORIZED",
            charterId: bookingData.charterId,
            ownerId: trip.charter.ownerId,
            userId: paymentSession.userId ?? undefined,
            metadata: {
              bookingId: booking.id,
              paymentMethod: paymentSession.paymentMethod,
              paymentFlow: "DIRECT",
              transactionId: transaction_id,
              tripId: trip.id,
              tripName: trip.name,
              date: bookingData.date,
              days: bookingData.days,
              adults: guests?.adults,
              children: guests?.children,
              amount: pricingBreakdown.finalPrice,
            },
          });
        } catch (err) {
          console.error("Failed to track PAYMENT_AUTHORIZED:", err);
        }
      })();

      // Trigger all side effects
      await triggerPaymentSideEffects({
        bookingId: booking.id,
        source: "callback",
      });

      return new NextResponse("OK", { status: 200 });
    }

    // Check if booking already exists (TOKENIZED flow)
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
      console.error("❌ [SENANGPAY CALLBACK] Booking/Session not found", {
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
