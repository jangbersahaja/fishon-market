import { trackEvent } from "@/lib/analytics-service";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { capturePayment } from "@/lib/payment/payment-gateway";
import {
  sendBookingApprovedEmail,
  sendBookingConfirmedAnglerEmail,
  sendBookingConfirmedCaptainEmail,
} from "@/lib/services/email-service";
import { sendMessage } from "@/lib/services/message-service";
import { bookingApprovedMessage } from "@/lib/services/message-templates";
import { createNotification } from "@/lib/services/notification-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

function isStaffOrAdmin(role?: string | null) {
  return role === "STAFF" || role === "ADMIN";
}

function hasCaptainSecret(req: Request) {
  const header = req.headers.get("x-captain-api-secret");
  const secret = process.env.CAPTAIN_API_SECRET;
  return Boolean(secret && header && header === secret);
}

export async function POST(req: Request) {
  try {
    const authorizedBySecret = hasCaptainSecret(req);

    let sessionRole: string | undefined;
    if (!authorizedBySecret) {
      const session = await auth();
      sessionRole = (session?.user as any)?.role;
      if (!isStaffOrAdmin(sessionRole)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { id } = body as { id?: string };
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Allow approval of PENDING (legacy) or PAYMENT_PENDING (new hybrid flow)
    if (booking.status !== "PENDING" && booking.status !== "PAYMENT_PENDING") {
      return NextResponse.json(
        { error: "Only pending or payment-pending bookings can be approved" },
        { status: 409 }
      );
    }

    // Check if booking expired
    if (booking.expiresAt && booking.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Booking expired and cannot be approved" },
        { status: 409 }
      );
    }

    // --- DUAL-FLOW PAYMENT HANDLING ---
    let finalStatus: "APPROVED" | "PAID" = "APPROVED";
    let paymentCapturedAt: Date | null = null;
    let paymentTransactionId: string | null = booking.paymentTransactionId;
    let captureError: string | null = null;

    // Determine payment action based on flow
    if (booking.status === "PAYMENT_PENDING") {
      const paymentFlow = booking.paymentFlow;
      const paymentMethod = booking.paymentMethod;

      // TOKENIZED flow (Card or MOCK): Charge the token
      if (paymentFlow === "TOKENIZED" || paymentFlow === "MOCK") {
        if (paymentMethod === "MOCK") {
          // MOCK: Simulate successful capture
          console.log("🎭 MOCK: Simulating payment capture for booking:", id);
          finalStatus = "PAID";
          paymentCapturedAt = new Date();
          paymentTransactionId = `mock-txn-${Date.now()}`;
        } else {
          // CARD: Actually charge the token
          if (!booking.paymentIntentId) {
            return NextResponse.json(
              { error: "Payment token missing - cannot charge card" },
              { status: 400 }
            );
          }

          console.log("💳 Charging card token:", {
            bookingId: id,
            tokenId: booking.paymentIntentId,
            amount: booking.finalPrice,
          });

          try {
            const captureResult = await capturePayment(
              booking.paymentIntentId,
              Number(booking.finalPrice),
              id
            );

            if (captureResult.success) {
              console.log(
                "✅ Card charged successfully:",
                captureResult.transactionId
              );
              finalStatus = "PAID";
              paymentCapturedAt = new Date();
              paymentTransactionId = captureResult.transactionId || null;
            } else {
              // Capture failed - return error to captain
              console.error("❌ Card capture failed:", captureResult.error);
              captureError = captureResult.error || "Card charge failed";

              // Don't approve booking if payment fails
              return NextResponse.json(
                {
                  error: `Payment failed: ${captureError}. Please ask angler to update payment method.`,
                  captureError: true,
                },
                { status: 402 } // Payment Required
              );
            }
          } catch (error: any) {
            console.error("❌ Card capture exception:", error);
            return NextResponse.json(
              {
                error:
                  "Payment processing error. Please try again or contact support.",
                captureError: true,
              },
              { status: 500 }
            );
          }
        }
      }
      // DIRECT flow (FPX/E-wallet): Already charged, just confirm
      else if (paymentFlow === "DIRECT") {
        console.log(
          "✅ DIRECT flow: Payment already captured, confirming booking:",
          id
        );

        // Verify payment was actually captured
        if (!booking.paymentTransactionId || !booking.paymentCapturedAt) {
          return NextResponse.json(
            { error: "Payment not yet received - cannot confirm booking" },
            { status: 400 }
          );
        }

        finalStatus = "PAID";
        paymentCapturedAt = booking.paymentCapturedAt; // Already set by callback
        paymentTransactionId = booking.paymentTransactionId;
      }
      // Unknown flow
      else {
        return NextResponse.json(
          { error: "Invalid payment flow - cannot process approval" },
          { status: 400 }
        );
      }
    }
    // Legacy PENDING status (old flow): Extend expiration for payment
    else if (booking.status === "PENDING") {
      const APPROVED_EXPIRY_HOURS = 48;
      finalStatus = "APPROVED";
      // Will set newExpiresAt below
    }

    // Calculate expiration based on final status
    let newExpiresAt: Date | null = null;
    if (finalStatus === "APPROVED") {
      // Legacy flow: 48 hours to pay
      const APPROVED_EXPIRY_HOURS = 48;
      newExpiresAt = new Date(
        Date.now() + APPROVED_EXPIRY_HOURS * 60 * 60 * 1000
      );
    } else if (finalStatus === "PAID") {
      // Payment confirmed: No expiration (trip date is the deadline)
      newExpiresAt = null;
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: finalStatus,
        captainDecisionAt: new Date(),
        cancellationReason: null,
        expiresAt: newExpiresAt ?? undefined,
        // Update payment tracking for successful captures
        ...(paymentCapturedAt && { paymentCapturedAt }),
        ...(paymentTransactionId && { paymentTransactionId }),
      },
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
        days: true,
        guests: true,
        tripPrice: true,
        finalPrice: true,
        startTime: true,
        expiresAt: true,
      },
    });

    // Notify captain app (best-effort)
    try {
      const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
      const hookSecret = process.env.CAPTAIN_API_SECRET;
      if (hookUrl && hookSecret) {
        const webhookType =
          finalStatus === "PAID" ? "booking.confirmed" : "booking.approved";
        const payload = {
          type: webhookType,
          booking: {
            id: updated.id,
            tripId: updated.tripId,
            charterId: updated.charterId,
            status: updated.status,
            paymentMethod: booking.paymentMethod,
            paymentFlow: booking.paymentFlow,
            paymentTransactionId: paymentTransactionId,
            captainEarnings: Number(updated.finalPrice) * 0.85, // 85% to captain
          },
        };
        sendWithRetry(hookUrl, payload, {
          headers: { "x-captain-secret": hookSecret },
          attempts: 3,
          baseDelayMs: 300,
        });
      }
    } catch {}

    // Track payment capture event (non-blocking)
    if (finalStatus === "PAID" && paymentCapturedAt) {
      (async () => {
        try {
          const { getCharterById } = await import(
            "@/lib/services/charter-service"
          );
          const charter = await getCharterById(updated.charterId);
          const guests = updated.guests as { adults: number; children: number };

          await trackEvent({
            eventType: "PAYMENT_CAPTURED",
            charterId: updated.charterId,
            ownerId: charter?.ownerId,
            userId: updated.userId ?? undefined,
            metadata: {
              bookingId: updated.id,
              paymentMethod: booking.paymentMethod,
              paymentFlow: booking.paymentFlow,
              transactionId: paymentTransactionId,
              amount: Number(updated.finalPrice),
              tripId: updated.tripId,
              date: updated.date.toISOString().slice(0, 10),
              days: updated.days,
              adults: guests.adults,
              children: guests.children,
              capturedVia: "approval",
            },
          });
        } catch (err) {
          console.error("Failed to track payment capture:", err);
        }
      })();
    }

    // Send system message to conversation (Phase 2.2) (non-blocking best-effort)
    (async () => {
      try {
        const conversation = await prisma.conversation.findUnique({
          where: { bookingId: updated.id },
        });

        if (conversation) {
          const templateMessage = bookingApprovedMessage();

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
            "✅ Booking approved system message sent:",
            conversation.id
          );
        }
      } catch (err) {
        console.error("❌ Failed to send approval message:", err);
        // Non-critical - booking is still approved
      }
    })();

    // Notify angler (non-blocking best-effort)
    (async () => {
      try {
        // Determine the recipient user ID (authenticated or guest)
        const recipientUserId = updated.userId;
        if (!recipientUserId) {
          console.warn("No userId for booking notification:", updated.id);
          return;
        }

        const trip = await getTripById(updated.tripId);
        if (trip) {
          // Different notification based on payment status
          if (finalStatus === "PAID") {
            // Payment captured - booking confirmed
            await createNotification({
              userId: recipientUserId,
              type: "BOOKING_CONFIRMED",
              title: "Booking Confirmed! 🎉",
              message: `Your booking with ${trip.charter.name} for ${updated.date.toISOString().slice(0, 10)} is confirmed! Payment received.`,
              actionUrl: `/account/bookings/${updated.id}`,
              actionLabel: "View Details",
              bookingId: updated.id,
              charterId: trip.charter.id,
              metadata: {
                charterName: trip.charter.name,
                tripDate: updated.date.toISOString().slice(0, 10),
                paymentMethod: booking.paymentMethod,
                amount: Number(updated.finalPrice),
              },
            });
          } else {
            // Legacy APPROVED status - needs payment
            await createNotification({
              userId: recipientUserId,
              type: "BOOKING_APPROVED",
              title: "Booking Approved! 🎉",
              message: `${trip.charter.name} approved your booking for ${updated.date.toISOString().slice(0, 10)}. Complete your payment to confirm your spot!`,
              actionUrl: `/book/payment/${updated.id}`,
              actionLabel: "Complete Payment",
              bookingId: updated.id,
              charterId: trip.charter.id,
              metadata: {
                charterName: trip.charter.name,
                tripDate: updated.date.toISOString().slice(0, 10),
              },
            });
          }
        }
      } catch (err) {
        console.error("Failed to create booking approved notification:", err);
      }
    })();

    // Email angler (best-effort)
    try {
      // Extract user data from booking.user relation
      const email = updated.user.email;
      const name =
        updated.user.name ||
        (updated.user.firstName && updated.user.lastName
          ? `${updated.user.firstName} ${updated.user.lastName}`
          : null);

      if (email) {
        // Get trip data for email
        const trip = await getTripById(updated.tripId);
        if (trip) {
          const base =
            process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
          const confirmationUrl = `${base}/book/confirm?id=${encodeURIComponent(updated.id)}`;
          const bookingUrl = `${base}/account/bookings/${encodeURIComponent(updated.id)}`;
          const paymentUrl = `${base}/book/payment/${encodeURIComponent(updated.id)}`;

          // Send different email based on payment status
          if (finalStatus === "PAID") {
            // Payment captured - send booking confirmed emails
            const tripDateDisplay = updated.date.toLocaleDateString("en-MY", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            // Calculate days from booking data (default to 1 if not specified)
            const tripDays = updated.days || 1;

            // Get start time from trip data or booking metadata
            const startTime = trip.startTimes?.[0] || "To be confirmed";

            // Send confirmation email to angler
            await sendBookingConfirmedAnglerEmail({
              to: email,
              userName: name ?? "there",
              charterName: trip.charter.name,
              tripName: trip.name,
              tripDate: tripDateDisplay,
              tripDays,
              durationHours: trip.durationHours,
              startTime,
              finalPrice: `RM ${updated.finalPrice.toFixed(2)}`,
              captainName: trip.charter.captain?.displayName || "Captain",
              captainEmail: trip.charter.captain?.email || "",
              captainPhone: trip.charter.captain?.phone || "",
              bookingUrl,
            });

            // Send confirmation email to captain
            if (trip.charter.captain?.email) {
              await sendBookingConfirmedCaptainEmail({
                to: trip.charter.captain.email,
                captainName: trip.charter.captain.displayName || "Captain",
                charterName: trip.charter.name,
                tripName: trip.name,
                tripDate: tripDateDisplay,
                tripDays,
                durationHours: trip.durationHours,
                startTime,
                finalPrice: `RM ${updated.finalPrice.toFixed(2)}`,
                anglerName: name ?? "Angler",
                anglerEmail: email,
                anglerPhone: "Available in booking details",
                bookingUrl: `${process.env.FISHON_CAPTAIN_URL}/bookings/${updated.id}`,
              });
            }

            console.log("✅ Booking confirmed emails sent (PAID status)");
          } else {
            // Legacy APPROVED status - needs payment
            await sendBookingApprovedEmail({
              to: email,
              userName: name ?? "there",
              charterName: trip.charter.name,
              tripDate: updated.date.toISOString().slice(0, 10),
              paymentUrl,
              confirmationUrl,
            });
            console.log("✅ Booking approved email sent (APPROVED status)");
          }
        }
      }
    } catch (err) {
      console.error("Failed to send booking approved email:", err);
    }

    // Revalidate angler pages
    try {
      revalidatePath("/book/confirm", "page");
      revalidatePath("/account/bookings", "page");
    } catch (error) {
      console.error("Revalidation failed:", error);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("booking.approve error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
