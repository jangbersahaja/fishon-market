import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import {
  sendBookingConfirmedAnglerEmail,
  sendBookingConfirmedCaptainEmail,
} from "@/lib/services/email-service";
import {
  sendMessage,
  unlockConversation,
} from "@/lib/services/message-service";
import { bookingAcknowledgedMessage } from "@/lib/services/message-templates";
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

/**
 * POST /api/bookings/acknowledge
 *
 * Acknowledge a PAYMENT_AUTHORIZED booking (Auto flow)
 * Transitions: PAYMENT_AUTHORIZED → PAID
 *
 * This is used when captain acknowledges receipt of payment in Auto flow.
 * After acknowledgment, the booking is fully confirmed.
 */
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

    // Only PAYMENT_AUTHORIZED bookings can be acknowledged (Auto flow)
    if (booking.status !== "PAYMENT_AUTHORIZED") {
      return NextResponse.json(
        {
          error: "Only payment_authorized bookings can be acknowledged",
          currentStatus: booking.status,
        },
        { status: 409 }
      );
    }

    // Verify this is an Auto flow booking
    if (booking.bookingFlowType !== "AUTO") {
      return NextResponse.json(
        {
          error:
            "Only auto flow bookings can be acknowledged. Manual flow bookings need approval first.",
        },
        { status: 409 }
      );
    }

    // Check if acknowledgment deadline passed
    if (
      booking.acknowledgmentDeadline &&
      booking.acknowledgmentDeadline < new Date()
    ) {
      return NextResponse.json(
        { error: "Acknowledgment deadline expired. Booking may be cancelled." },
        { status: 409 }
      );
    }

    // --- AUTO FLOW: PAYMENT_AUTHORIZED → PAID ---
    // Captain acknowledges payment and confirms booking
    // paymentCapturedAt marks when the token was actually charged (TOKENIZED)
    // or confirms the direct payment (DIRECT)
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: "PAID",
        captainDecisionAt: new Date(),
        paymentCapturedAt: new Date(), // Mark payment as captured
        paidAt: new Date(), // Also set paidAt for consistency
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
    });

    // Unlock conversation so captain and angler can chat
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { bookingId: updated.id },
      });
      if (conversation) {
        // Unlock if still locked
        if (conversation.status === "LOCKED") {
          await unlockConversation(conversation.id);
          console.log("✅ Conversation unlocked:", conversation.id);
        }

        // Send acknowledgment system message
        const templateMessage = bookingAcknowledgedMessage();
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
          "✅ Booking acknowledged system message sent:",
          conversation.id
        );
      }
    } catch (err) {
      console.error("Failed to unlock conversation or send message:", err);
    }

    // Notify captain app (best-effort)
    try {
      const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
      const hookSecret = process.env.CAPTAIN_API_SECRET;
      if (hookUrl && hookSecret) {
        const payload = {
          type: "booking.acknowledged",
          booking: {
            id: updated.id,
            tripId: updated.tripId,
            charterId: updated.charterId,
            status: updated.status,
            bookingFlowType: booking.bookingFlowType,
          },
        };
        sendWithRetry(hookUrl, payload, {
          headers: { "x-captain-secret": hookSecret },
          attempts: 3,
          baseDelayMs: 300,
        });
      }
    } catch (webhookErr) {
      console.error("Failed to send webhook:", webhookErr);
    }

    // Notify angler (non-blocking best-effort)
    (async () => {
      try {
        const recipientUserId = updated.userId;
        if (!recipientUserId) {
          console.warn("No userId for booking notification:", updated.id);
          return;
        }

        const trip = await getTripById(updated.tripId);
        if (trip) {
          await createNotification({
            userId: recipientUserId,
            type: "BOOKING_CONFIRMED",
            title: "Booking Confirmed! 🎉",
            message: `Your booking for ${trip.charter.name} on ${updated.date.toISOString().slice(0, 10)} has been confirmed by the captain!`,
            actionUrl: `/ms/book/confirm?id=${updated.id}`,
            actionLabel: "View Booking",
            bookingId: updated.id,
            charterId: trip.charter.id,
            metadata: {
              charterName: trip.charter.name,
              tripDate: updated.date.toISOString().slice(0, 10),
            },
          });
        }
      } catch (err) {
        console.error("Failed to create booking confirmed notification:", err);
      }
    })();

    // Email angler (best-effort)
    try {
      const email = updated.user.email;
      const name =
        updated.user.name ||
        (updated.user.firstName && updated.user.lastName
          ? `${updated.user.firstName} ${updated.user.lastName}`
          : null);

      if (email) {
        const trip = await getTripById(updated.tripId);
        if (trip) {
          const anglerPhone = (updated.user as any).phone || "";
          await sendBookingConfirmedAnglerEmail({
            to: email,
            userName: name || email,
            charterName: trip.charter.name,
            tripName: trip.name,
            tripDate: updated.date.toISOString().split("T")[0],
            tripDays: updated.days,
            durationHours: trip.durationHours,
            startTime: updated.startTime || undefined,
            finalPrice: updated.finalPrice.toFixed(2),
            captainName: trip.charter.captain?.displayName || "Captain",
            captainEmail: trip.charter.captain?.email || "",
            captainPhone: trip.charter.captain?.phone || "",
            bookingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/ms/book/confirm?id=${updated.id}`,
          });

          // Also send email to captain with pricing breakdown
          const finalPrice = Number(updated.finalPrice);
          const platformFee = Number(updated.platformFee || 0);
          const captainEarnings = Number(updated.captainEarnings || 0);
          const subtotal = captainEarnings + platformFee;

          await sendBookingConfirmedCaptainEmail({
            to: trip.charter.captain?.email || "",
            captainName: trip.charter.captain?.displayName || "Captain",
            charterName: trip.charter.name,
            anglerName: name || email,
            tripName: trip.name,
            tripDate: updated.date.toISOString().split("T")[0],
            tripDays: updated.days,
            durationHours: trip.durationHours,
            startTime: updated.startTime || undefined,
            finalPrice: `RM ${finalPrice.toFixed(2)}`,
            anglerEmail: email,
            anglerPhone: anglerPhone,
            bookingUrl: `${process.env.NEXT_PUBLIC_CAPTAIN_DASHBOARD_URL}/bookings/${updated.id}`,
            subtotal: `RM ${subtotal.toFixed(2)}`,
            platformFee: `RM ${platformFee.toFixed(2)}`,
            captainEarnings: `RM ${captainEarnings.toFixed(2)}`,
            paymentFlow:
              (updated.paymentFlow as "TOKENIZED" | "DIRECT") || "DIRECT",
          });
        }
      }
    } catch (err) {
      console.error("Failed to send confirmation notification/email:", err);
    }

    // Revalidate paths for all locales
    const locales = ["ms", "en"];
    revalidatePath("/captain/bookings");
    revalidatePath(`/captain/bookings/${updated.id}`);
    for (const locale of locales) {
      revalidatePath(`/${locale}/account/bookings`);
      revalidatePath(`/${locale}/book/confirm?id=${updated.id}`);
    }

    // Revalidate message page if conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { bookingId: updated.id },
      select: { id: true },
    });

    if (conversation) {
      for (const locale of locales) {
        revalidatePath(`/${locale}/account/messages/${conversation.id}`);
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: updated.id,
        status: updated.status,
      },
    });
  } catch (error: any) {
    console.error("Acknowledge booking error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to acknowledge booking" },
      { status: 500 }
    );
  }
}
