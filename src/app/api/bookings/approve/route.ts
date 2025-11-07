import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { sendBookingApprovedEmail } from "@/lib/services/email-service";
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
    if (booking.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending bookings can be approved" },
        { status: 409 }
      );
    }

    // Extend expiration for APPROVED bookings (48 hours to pay)
    const APPROVED_EXPIRY_HOURS = 48;
    const newExpiresAt = new Date(
      Date.now() + APPROVED_EXPIRY_HOURS * 60 * 60 * 1000
    );

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: "APPROVED",
        captainDecisionAt: new Date(),
        cancellationReason: null,
        // Extend expiration: anglers have 48 hours to complete payment
        expiresAt: newExpiresAt,
      },
      select: {
        id: true,
        status: true,
        userId: true,
        guestEmail: true,
        guestFirstName: true,
        guestLastName: true,
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
        const payload = {
          type: "booking.approved",
          booking: {
            id: updated.id,
            tripId: updated.tripId,
            charterId: updated.charterId,
            status: updated.status,
          },
        };
        sendWithRetry(hookUrl, payload, {
          headers: { "x-captain-secret": hookSecret },
          attempts: 3,
          baseDelayMs: 300,
        });
      }
    } catch {}

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
      } catch (err) {
        console.error("Failed to create booking approved notification:", err);
      }
    })();

    // Email angler (best-effort)
    try {
      // Handle both authenticated and guest bookings
      const user = updated.userId
        ? await prisma.user.findUnique({
            where: { id: updated.userId },
          })
        : null;

      const email = user?.email || updated.guestEmail;
      const name =
        user?.name ||
        (updated.guestFirstName
          ? `${updated.guestFirstName} ${updated.guestLastName}`
          : null);

      if (email) {
        // Get trip data for email
        const trip = await getTripById(updated.tripId);
        if (trip) {
          const base =
            process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
          const confirmationUrl = `${base}/book/confirm?id=${encodeURIComponent(updated.id)}`;
          const paymentUrl = `${base}/book/payment/${encodeURIComponent(updated.id)}`;

          await sendBookingApprovedEmail({
            to: email,
            userName: name ?? "there",
            charterName: trip.charter.name,
            tripDate: updated.date.toISOString().slice(0, 10),
            paymentUrl,
            confirmationUrl,
          });
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
