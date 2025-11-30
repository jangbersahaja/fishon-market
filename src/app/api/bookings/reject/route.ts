import { trackEvent } from "@/lib/analytics-service";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { releasePayment } from "@/lib/payment/payment-gateway";
import { sendBookingRejectedEmail } from "@/lib/services/email-service";
import { sendMessage } from "@/lib/services/message-service";
import { bookingRejectedMessage } from "@/lib/services/message-templates";
import { createNotification } from "@/lib/services/notification-service";
import { initiateRefund } from "@/lib/services/refund-service";
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
    const { id, reason } = body as { id?: string; reason?: string };
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Allow rejection of PENDING (Manual flow), PAYMENT_AUTHORIZED (Auto flow), or PAID (post-acknowledgment rejection)
    const rejectableStatuses = ["PENDING", "PAYMENT_AUTHORIZED", "PAID"];
    if (!rejectableStatuses.includes(booking.status)) {
      return NextResponse.json(
        { error: "Only pending or payment-pending bookings can be rejected" },
        { status: 409 }
      );
    }

    // For PAID bookings, ensure it's DIRECT flow awaiting captain decision
    if (booking.status === "PAID") {
      if (booking.paymentFlow !== "DIRECT" || booking.captainDecisionAt) {
        return NextResponse.json(
          { error: "Cannot reject confirmed bookings" },
          { status: 409 }
        );
      }
    }

    // --- DUAL-FLOW PAYMENT HANDLING ---
    let paymentReleasedAt: Date | null = null;
    let needsRefundProcessing = false;

    // Determine payment action based on flow
    if (booking.status === "PAYMENT_AUTHORIZED" || booking.status === "PAID") {
      const paymentFlow = booking.paymentFlow;
      const paymentMethod = booking.paymentMethod;

      // TOKENIZED flow (Card or MOCK): Release token (no charge)
      if (paymentFlow === "TOKENIZED" || paymentFlow === "MOCK") {
        if (paymentMethod === "MOCK") {
          // MOCK: Simulate token release
          console.log("🎭 MOCK: Simulating token release for booking:", id);
          paymentReleasedAt = new Date();
        } else {
          // CARD: Release token without charging
          if (!booking.paymentIntentId) {
            console.warn("⚠️ No payment token found, skipping release");
          } else {
            console.log("🔓 Releasing card token:", {
              bookingId: id,
              tokenId: booking.paymentIntentId,
            });

            try {
              const releaseResult = await releasePayment(
                booking.paymentIntentId
              );

              if (releaseResult.success) {
                console.log("✅ Token released successfully");
                paymentReleasedAt = new Date();
              } else {
                console.warn("⚠️ Token release failed:", releaseResult.error);
                // Continue with rejection anyway - token will expire
                paymentReleasedAt = new Date();
              }
            } catch (error: any) {
              console.error("❌ Token release exception:", error);
              // Continue with rejection - token will expire
              paymentReleasedAt = new Date();
            }
          }
        }
      }
      // DIRECT flow (FPX/E-wallet): Must refund (angler already paid)
      else if (paymentFlow === "DIRECT") {
        console.log(
          "💰 DIRECT flow: Initiating refund for rejected booking:",
          id
        );

        // Verify payment was captured
        if (!booking.paymentTransactionId || !booking.paymentCapturedAt) {
          console.warn("⚠️ No payment transaction found, skipping refund");
        } else {
          try {
            // Initiate FULL refund via refund service
            await initiateRefund({
              bookingId: id,
              reason: "CAPTAIN_REJECTION",
              refundType: "FULL",
              initiatedBy: "CAPTAIN",
            });

            console.log("✅ Refund initiated");
            needsRefundProcessing = true;
          } catch (error: any) {
            console.error("❌ Refund initiation failed:", error);
            // Log error but continue with rejection
            // Manual refund will be needed
            return NextResponse.json(
              {
                error:
                  "Payment refund failed. Please contact support for manual refund processing.",
                refundError: true,
              },
              { status: 500 }
            );
          }
        }
      }
    }

    // Update booking status to REJECTED
    const now = new Date();
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason || null,
      },
      select: {
        id: true,
        userId: true,
        tripId: true,
        charterId: true,
        status: true,
        rejectionReason: true,
        refundAmount: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    // Notify captain app (best-effort)
    try {
      const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
      const hookSecret = process.env.CAPTAIN_API_SECRET;
      if (hookUrl && hookSecret) {
        const payload = {
          type: "booking.rejected",
          booking: {
            id: updated.id,
            tripId: updated.tripId,
            charterId: updated.charterId,
            status: updated.status,
            rejectionReason: updated.rejectionReason,
            paymentMethod: booking.paymentMethod,
            paymentFlow: booking.paymentFlow,
            refundInitiated: needsRefundProcessing,
          },
        };
        sendWithRetry(hookUrl, payload, {
          headers: { "x-captain-secret": hookSecret },
          attempts: 3,
          baseDelayMs: 300,
        });
      }
    } catch {}

    // Track payment release or refund event (non-blocking)
    (async () => {
      try {
        const { getCharterById } = await import(
          "@/lib/services/charter-service"
        );
        const charter = await getCharterById(updated.charterId);

        if (paymentReleasedAt) {
          // TOKENIZED flow: Token released
          await trackEvent({
            eventType: "PAYMENT_RELEASED",
            charterId: updated.charterId,
            ownerId: charter?.ownerId,
            userId: updated.userId ?? undefined,
            metadata: {
              bookingId: updated.id,
              paymentMethod: booking.paymentMethod,
              paymentFlow: booking.paymentFlow,
              tokenId: booking.paymentIntentId,
              reason: "captain_rejection",
            },
          });
        }

        if (needsRefundProcessing) {
          // DIRECT flow: Refund initiated
          await trackEvent({
            eventType: "PAYMENT_REFUNDED",
            charterId: updated.charterId,
            ownerId: charter?.ownerId,
            userId: updated.userId ?? undefined,
            metadata: {
              bookingId: updated.id,
              paymentMethod: booking.paymentMethod,
              paymentFlow: booking.paymentFlow,
              transactionId: booking.paymentTransactionId,
              refundAmount: Number(booking.finalPrice),
              reason: "captain_rejection",
            },
          });
        }
      } catch (err) {
        console.error("Failed to track payment release/refund:", err);
      }
    })();

    // Send system message to conversation (Phase 2.2) (non-blocking best-effort)
    (async () => {
      try {
        const conversation = await prisma.conversation.findUnique({
          where: { bookingId: updated.id },
        });

        if (conversation) {
          const templateMessage = bookingRejectedMessage(
            updated.rejectionReason ?? undefined
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
            "✅ Booking rejected system message sent:",
            conversation.id
          );
        }
      } catch (err) {
        console.error("❌ Failed to send rejection message:", err);
        // Non-critical - booking is still rejected
      }
    })();

    // Notify angler (non-blocking best-effort)
    (async () => {
      try {
        const recipientUserId = updated.userId;
        if (!recipientUserId) {
          console.warn("No userId for rejection notification:", updated.id);
          return;
        }

        const trip = await getTripById(updated.tripId);
        if (trip) {
          // Different message based on payment flow
          let notificationMessage = `Unfortunately, ${trip.charter.name} couldn't accommodate your booking request.`;

          if (needsRefundProcessing) {
            // DIRECT flow: Mention refund
            notificationMessage +=
              " Your payment will be refunded within 3-5 business days.";
          } else if (paymentReleasedAt) {
            // TOKENIZED flow: No charge
            notificationMessage += " Your card was not charged.";
          }

          if (updated.rejectionReason) {
            notificationMessage += ` Reason: ${updated.rejectionReason}`;
          }

          await createNotification({
            userId: recipientUserId,
            type: "BOOKING_REJECTED",
            title: "Booking Update",
            message: notificationMessage,
            actionUrl: `/ms/search`,
            actionLabel: "Find Other Charters",
            bookingId: updated.id,
            charterId: updated.charterId,
            metadata: {
              charterName: trip.charter.name,
              reason: updated.rejectionReason ?? undefined,
              paymentFlow: booking.paymentFlow,
              refundInitiated: needsRefundProcessing,
            },
          });
        }
      } catch (err) {
        console.error("Failed to create booking rejected notification:", err);
      }
    })();

    // Email angler (best-effort)
    try {
      const email = updated.user?.email;
      const name = updated.user?.name;

      if (email) {
        // Get trip data for email
        const trip = await getTripById(updated.tripId);
        if (trip) {
          const base =
            process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
          const searchUrl = `${base}/ms/search`;

          await sendBookingRejectedEmail({
            to: email,
            userName: name ?? "there",
            charterName: trip.charter.name,
            reason: updated.rejectionReason ?? undefined,
            searchUrl,
            paymentFlow: booking.paymentFlow as
              | "TOKENIZED"
              | "DIRECT"
              | undefined,
            refundAmount: updated.refundAmount
              ? `RM ${updated.refundAmount.toFixed(2)}`
              : undefined,
          });
        }
      }
    } catch (err) {
      console.error("Failed to send booking rejected email:", err);
    }

    // Revalidate angler pages for all locales
    try {
      const locales = ["ms", "en"];
      for (const locale of locales) {
        revalidatePath(`/${locale}/book/confirm`, "page");
        revalidatePath(`/${locale}/account/bookings`, "page");
      }

      // Revalidate messages page if conversation exists
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
    console.error("booking.reject error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
