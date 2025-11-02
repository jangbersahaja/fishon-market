import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import {
  checkRateLimit,
  getClientIP,
  getRateLimitResetTime,
} from "@/lib/rateLimit";
import { sendBookingCancelledEmail } from "@/lib/services/email-service";
import { createNotification } from "@/lib/services/notification-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  const body = await req.json().catch(() => ({}));
  const { id, email, cancellationReason } = body as {
    id?: string;
    email?: string;
    cancellationReason?: string;
  };

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Fetch booking
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      userId: true,
      guestEmail: true,
      guestFirstName: true,
      guestLastName: true,
      tripId: true,
      charterId: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Check booking status
  if (booking.status !== "PENDING" && booking.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Cannot cancel booking in current status" },
      { status: 409 }
    );
  }

  // Determine booking email
  const bookingEmail = booking.user?.email || booking.guestEmail;
  if (!bookingEmail) {
    return NextResponse.json(
      { error: "No email associated with this booking" },
      { status: 400 }
    );
  }

  // Authorization: Two methods
  // 1. Authenticated user owns the booking
  // 2. Email verification (guest or non-owner)

  const isAuthenticatedOwner =
    session?.user?.id && booking.userId === session.user.id;

  if (!isAuthenticatedOwner) {
    // Email verification required
    if (!email) {
      return NextResponse.json(
        { error: "Email verification required" },
        { status: 403 }
      );
    }

    // Validate email matches booking
    if (email.toLowerCase() !== bookingEmail.toLowerCase()) {
      // Rate limiting for failed attempts
      const clientIP = getClientIP(req);
      const rateLimitKey = `cancel:${id}:${clientIP}`;
      const attempts = checkRateLimit(rateLimitKey, 3600000); // 1 hour window

      if (attempts > 3) {
        const resetTime = getRateLimitResetTime(rateLimitKey);
        const minutesRemaining = Math.ceil(resetTime / 60000);
        return NextResponse.json(
          {
            error: "Too many failed attempts. Please try again later.",
            retryAfter: minutesRemaining,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "Email does not match booking email",
          attemptsRemaining: Math.max(0, 3 - attempts),
        },
        { status: 403 }
      );
    }
  }

  // Update booking status
  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancellationReason: cancellationReason || null,
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
      cancellationReason: true,
    },
  });

  // Notify captain app (best-effort)
  try {
    const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
    const hookSecret = process.env.CAPTAIN_API_SECRET;
    console.log("📤 [WEBHOOK] Preparing to send booking.cancelled webhook", {
      hookUrl,
      hasSecret: !!hookSecret,
      bookingId: updated.id,
      charterId: updated.charterId,
    });

    if (hookUrl && hookSecret) {
      // Fetch trip data for webhook payload
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
        type: "booking.cancelled",
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

      console.log(
        "🚀 [WEBHOOK] Sending cancellation webhook to captain app..."
      );
      sendWithRetry(hookUrl, payload, {
        headers: { "x-captain-secret": hookSecret },
        attempts: 3,
        baseDelayMs: 300,
      });
    } else {
      console.warn("⚠️ [WEBHOOK] Skipping webhook - missing URL or secret");
    }
  } catch (webhookError) {
    console.error(
      "❌ [WEBHOOK] Failed to send cancellation webhook:",
      webhookError
    );
  }

  // Notify angler (non-blocking best-effort)
  (async () => {
    try {
      const recipientUserId = updated.userId;
      if (!recipientUserId) return;

      const trip = await getTripById(updated.tripId);
      if (!trip) return;

      await createNotification({
        userId: recipientUserId,
        type: "BOOKING_CANCELLED",
        title: "Booking Cancelled",
        message: `Your booking for ${trip.charter.name} on ${updated.date.toISOString().slice(0, 10)} has been cancelled.${updated.cancellationReason ? ` Reason: ${updated.cancellationReason}` : ""}`,
        actionUrl: `/search`,
        actionLabel: "Find Another Charter",
        bookingId: updated.id,
        charterId: updated.charterId,
        metadata: {
          charterName: trip.charter.name,
          tripDate: updated.date.toISOString().slice(0, 10),
          cancellationReason: updated.cancellationReason ?? undefined,
        },
      });
    } catch (err) {
      console.error("Failed to create cancellation notification:", err);
    }
  })();

  // Email captain about cancellation (non-blocking best-effort)
  (async () => {
    try {
      // Fetch trip data to get captain info
      const trip = await getTripById(updated.tripId);
      if (!trip) return;

      const captain = trip.charter.captain;
      if (!captain?.email) {
        console.warn(
          "Captain email not available for cancellation notification:",
          updated.id
        );
        return;
      }

      const user = updated.userId
        ? await prisma.user.findUnique({
            where: { id: updated.userId },
          })
        : null;

      const anglerName =
        user?.name ||
        (updated.guestFirstName
          ? `${updated.guestFirstName} ${updated.guestLastName}`
          : "Angler");

      const captainBaseUrl =
        process.env.FISHON_CAPTAIN_API_URL || "http://localhost:3000";
      const bookingUrl = `${captainBaseUrl}/captain/bookings/${encodeURIComponent(
        updated.id
      )}`;

      await sendBookingCancelledEmail({
        to: captain.email,
        captainName: captain.displayName,
        charterName: trip.charter.name,
        anglerName: anglerName,
        tripName: trip.name,
        tripDate: updated.date.toISOString().slice(0, 10),
        cancellationReason: updated.cancellationReason ?? undefined,
        bookingUrl,
      });
    } catch (err) {
      console.error("Failed to send captain cancellation email:", err);
    }
  })();

  // Revalidate angler pages
  try {
    revalidatePath("/book/confirm", "page");
    revalidatePath("/account/bookings", "page");
  } catch (error) {
    console.error("Revalidation failed:", error);
  }

  return NextResponse.json({ ok: true });
}
