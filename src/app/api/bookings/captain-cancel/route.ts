import { trackEvent } from "@/lib/analytics-service";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { sendBookingRejectedEmail } from "@/lib/services/email-service";
import { sendMessage } from "@/lib/services/message-service";
import { bookingCancelledMessage } from "@/lib/services/message-templates";
import { createNotification } from "@/lib/services/notification-service";
import { initiateRefund } from "@/lib/services/refund-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Captain Cancellation API
 *
 * Handles captain cancellation of CONFIRMED (PAID) bookings.
 * Per policy:
 * - Captain must provide a reason
 * - Angler receives FULL refund (100%)
 * - Captain bears all refund costs
 *
 * This is DIFFERENT from rejection:
 * - Rejection: Before payment confirmation (PENDING, PAYMENT_AUTHORIZED, or PAID awaiting captain decision in DIRECT flow)
 * - Captain Cancellation: After payment confirmation (PAID with captain already acknowledged)
 */

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
    const { id, reason } = body as { id?: string; reason?: string };

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        {
          error:
            "A detailed cancellation reason is required (minimum 10 characters)",
        },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Captain cancellation ONLY for confirmed PAID bookings
    // Must have been acknowledged (captainDecisionAt set for DIRECT flow, or TOKENIZED flow after capture)
    const isPaidAndConfirmed =
      booking.status === "PAID" &&
      (booking.paymentFlow === "TOKENIZED" || // TOKENIZED: payment captured = confirmed
        (booking.paymentFlow === "DIRECT" && booking.captainDecisionAt)); // DIRECT: must be acknowledged

    if (!isPaidAndConfirmed) {
      return NextResponse.json(
        {
          error:
            "Only confirmed PAID bookings can be cancelled by captain. Use reject for pending bookings.",
        },
        { status: 409 }
      );
    }

    // --- INITIATE REFUND (if applicable) ---
    let refundInitiated = false;
    const isMockPayment =
      booking.paymentMethod === "MOCK" || booking.paymentFlow === "MOCK";
    const hasPaymentTransaction =
      booking.paymentTransactionId && booking.paymentCapturedAt;

    if (isMockPayment) {
      // MOCK payment: Skip actual refund, just log
      console.log("🎭 MOCK payment: Skipping refund for booking:", id);
      refundInitiated = true; // Treat as successful for mock
    } else if (hasPaymentTransaction) {
      // Real payment: Initiate refund
      console.log(
        "💰 Captain cancellation: Initiating FULL refund for booking:",
        id
      );

      try {
        await initiateRefund({
          bookingId: id,
          reason: "CAPTAIN_CANCELLATION",
          refundType: "FULL",
          initiatedBy: "CAPTAIN",
        });
        console.log("✅ Full refund initiated");
        refundInitiated = true;
      } catch (error: any) {
        console.error("❌ Refund initiation failed:", error);
        return NextResponse.json(
          {
            error:
              "Payment refund failed. Please contact support for manual refund processing.",
            refundError: true,
          },
          { status: 500 }
        );
      }
    } else {
      // No payment transaction found - still allow cancellation but log warning
      console.warn(
        "⚠️ No payment transaction found for booking:",
        id,
        "- cancelling without refund"
      );
      refundInitiated = false;
    }

    // Update booking status to CANCELLED with captain as canceller
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledBy: "CAPTAIN",
        cancellationReason: reason.trim(),
      },
    });

    // Fetch user info for notifications
    const user = updated.userId
      ? await prisma.user.findUnique({
          where: { id: updated.userId },
          select: { email: true, name: true },
        })
      : null;

    // Notify captain app (best-effort webhook)
    try {
      const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
      const hookSecret = process.env.CAPTAIN_API_SECRET;
      if (hookUrl && hookSecret) {
        const payload = {
          type: "booking.captain_cancelled",
          booking: {
            id: updated.id,
            tripId: updated.tripId,
            charterId: updated.charterId,
            status: updated.status,
            cancellationReason: updated.cancellationReason,
            paymentMethod: updated.paymentMethod,
            paymentFlow: updated.paymentFlow,
            refundAmount: Number(updated.finalPrice),
            refundInitiated,
          },
        };
        sendWithRetry(hookUrl, payload, {
          headers: { "x-captain-secret": hookSecret },
          attempts: 3,
          baseDelayMs: 300,
        });
      }
    } catch {}

    // Track analytics event (non-blocking)
    // Note: Using PAYMENT_REFUNDED since BOOKING_CAPTAIN_CANCELLED is not in enum
    (async () => {
      try {
        const { getCharterById } = await import(
          "@/lib/services/charter-service"
        );
        const charter = await getCharterById(updated.charterId);

        await trackEvent({
          eventType: "PAYMENT_REFUNDED",
          charterId: updated.charterId,
          ownerId: charter?.ownerId,
          userId: updated.userId ?? undefined,
          metadata: {
            bookingId: updated.id,
            paymentMethod: updated.paymentMethod,
            paymentFlow: updated.paymentFlow,
            refundAmount: Number(updated.finalPrice),
            reason: "captain_cancellation",
            cancellationReason: updated.cancellationReason,
          },
        });
      } catch (err) {
        console.error("Failed to track captain cancellation:", err);
      }
    })();

    // Send system message to conversation (non-blocking)
    (async () => {
      try {
        const conversation = await prisma.conversation.findUnique({
          where: { bookingId: updated.id },
        });

        if (conversation) {
          const templateMessage = bookingCancelledMessage(
            "captain",
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
            "✅ Captain cancellation system message sent:",
            conversation.id
          );
        }
      } catch (err) {
        console.error("❌ Failed to send cancellation message:", err);
      }
    })();

    // Notify angler (non-blocking)
    (async () => {
      try {
        const recipientUserId = updated.userId;
        if (!recipientUserId) {
          console.warn("No userId for cancellation notification:", updated.id);
          return;
        }

        const trip = await getTripById(updated.tripId);
        if (trip) {
          const refundAmount = updated.finalPrice
            ? `RM ${Number(updated.finalPrice).toFixed(2)}`
            : "";
          let notificationMessage = `The captain of ${trip.charter.name} has cancelled your confirmed booking.`;
          notificationMessage += ` Your full payment of ${refundAmount} will be refunded within 3-5 business days.`;

          if (updated.cancellationReason) {
            notificationMessage += ` Reason: ${updated.cancellationReason}`;
          }

          await createNotification({
            userId: recipientUserId,
            type: "BOOKING_CANCELLED",
            title: "Booking Cancelled by Captain",
            message: notificationMessage,
            actionUrl: `/my/search`,
            actionLabel: "Find Other Charters",
            bookingId: updated.id,
            charterId: updated.charterId,
            metadata: {
              charterName: trip.charter.name,
              reason: updated.cancellationReason ?? undefined,
              cancelledBy: "CAPTAIN",
              refundAmount,
            },
          });
        }
      } catch (err) {
        console.error(
          "Failed to create captain cancellation notification:",
          err
        );
      }
    })();

    // Email angler (best-effort)
    try {
      const email = user?.email;
      const name = user?.name;

      if (email) {
        const trip = await getTripById(updated.tripId);
        if (trip) {
          const base =
            process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
          const searchUrl = `${base}/my/search`;
          const refundAmount = updated.finalPrice
            ? `RM ${Number(updated.finalPrice).toFixed(2)}`
            : undefined;

          // Use BookingRejectedEmail template with captain cancellation context
          // The template handles refund messaging for DIRECT flow
          await sendBookingRejectedEmail({
            to: email,
            userName: name ?? "there",
            charterName: trip.charter.name,
            reason: `Captain cancelled your confirmed booking. Reason: ${updated.cancellationReason}`,
            searchUrl,
            paymentFlow: "DIRECT", // Always show refund message for captain cancellation
            refundAmount,
            userId: updated.userId ?? undefined,
            bookingId: updated.id,
          });
        }
      }
    } catch (err) {
      console.error("Failed to send captain cancellation email:", err);
    }

    // Revalidate angler pages for all locales
    try {
      const locales = ["my", "en"];
      for (const locale of locales) {
        revalidatePath(`/${locale}/book/confirm`, "page");
        revalidatePath(`/${locale}/account/bookings`, "page");
      }

      const conversation = await prisma.conversation.findUnique({
        where: { bookingId: updated.id },
        select: { id: true },
      });
      if (conversation) {
        for (const locale of locales) {
          revalidatePath(
            `/${locale}/account/messages/${conversation.id}`,
            "page"
          );
        }
      }
    } catch (error) {
      console.error("Revalidation failed:", error);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("booking.captain-cancel error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
