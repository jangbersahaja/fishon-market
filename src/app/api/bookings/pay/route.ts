import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import {
  sendBookingConfirmedAnglerEmail,
  sendBookingConfirmedCaptainEmail,
} from "@/lib/services/email-service";
import { createNotification } from "@/lib/services/notification-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { NextResponse } from "next/server";

// Minimal pay endpoint to mark an APPROVED booking as PAID for the owner
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { id } = body as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Only allow transition from APPROVED and for this user
  const result = await prisma.booking
    .updateMany({
      where: { id, userId: session.user.id, status: "APPROVED" },
      data: { status: "PAID" },
    })
    .catch(() => ({ count: 0 }));

  if (!result || result.count === 0) {
    return NextResponse.json(
      { error: "No APPROVED booking for this user" },
      { status: 409 }
    );
  }

  // Fetch updated booking for notifications
  const updated =
    typeof (prisma as any)?.booking?.findUnique === "function"
      ? await (prisma as any).booking
          .findUnique({ where: { id } })
          .catch(() => null)
      : null;

  // Notify angler (non-blocking best-effort)
  (async () => {
    try {
      if (!updated || !session?.user?.id) return;

      const trip = await getTripById(updated.tripId);
      if (!trip) return;

      await createNotification({
        userId: session.user.id,
        type: "BOOKING_PAID",
        title: "Payment Confirmed! ✅",
        message: `Your payment for ${trip.charter.name} on ${updated.date.toISOString().slice(0, 10)} has been confirmed. Get ready for an amazing trip!`,
        actionUrl: `/book/confirm?id=${updated.id}`,
        actionLabel: "View Booking Details",
        bookingId: updated.id,
        charterId: trip.charter.id,
        metadata: {
          charterName: trip.charter.name,
          tripDate: updated.date.toISOString().slice(0, 10),
        },
      });
    } catch (err) {
      console.error("Failed to create payment notification:", err);
    }
  })();

  // Email angler confirmation (non-blocking best-effort)
  (async () => {
    try {
      if (!updated) return;

      const user = await prisma.user.findUnique({
        where: { id: updated.userId },
      });
      if (!user?.email) return;

      // Fetch trip data to get all details
      const trip = await getTripById(updated.tripId);
      if (!trip) return;

      const captain = trip.charter.captain;
      if (!captain) return;

      const base =
        process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
      const bookingUrl = `${base}/book/confirm?id=${encodeURIComponent(
        updated.id
      )}`;

      await sendBookingConfirmedAnglerEmail({
        to: user.email,
        userName: user.name ?? "there",
        charterName: trip.charter.name,
        captainName: captain.displayName,
        captainEmail: captain.email,
        captainPhone: captain.phone || "",
        tripName: trip.name,
        tripDate: updated.date.toISOString().slice(0, 10),
        tripDays: updated.days,
        durationHours: trip.durationHours,
        startTime: updated.startTime ?? undefined,
        finalPrice: `RM ${Number(updated.finalPrice).toFixed(2)}`,
        bookingUrl,
      });
    } catch (err) {
      console.error("Failed to send angler payment confirmation email:", err);
    }
  })();

  // Email captain confirmation (non-blocking best-effort)
  (async () => {
    try {
      if (!updated) return;

      // Fetch trip data to get captain info
      const trip = await getTripById(updated.tripId);
      if (!trip) return;

      const captain = trip.charter.captain;
      if (!captain?.email) {
        console.warn(
          "Captain email not available for payment confirmation:",
          updated.id
        );
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: updated.userId },
      });

      const captainBaseUrl =
        process.env.FISHON_CAPTAIN_API_URL || "http://localhost:3000";
      const bookingUrl = `${captainBaseUrl}/captain/bookings/${encodeURIComponent(
        updated.id
      )}`;

      await sendBookingConfirmedCaptainEmail({
        to: captain.email,
        captainName: captain.displayName,
        charterName: trip.charter.name,
        anglerName: user?.name ?? "Angler",
        anglerEmail: user?.email ?? "",
        anglerPhone: user?.phone ?? "",
        tripName: trip.name,
        tripDate: updated.date.toISOString().slice(0, 10),
        tripDays: updated.days,
        durationHours: trip.durationHours,
        startTime: updated.startTime ?? undefined,
        finalPrice: `RM ${Number(updated.finalPrice).toFixed(2)}`,
        bookingUrl,
      });
    } catch (err) {
      console.error("Failed to send captain payment confirmation email:", err);
    }
  })();

  // Best-effort: notify Captain app that booking was paid
  try {
    const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
    const hookSecret = process.env.CAPTAIN_API_SECRET;
    if (hookUrl && hookSecret && updated) {
      const payload = {
        type: "booking.paid",
        booking: {
          id: updated.id,
          captainCharterId: updated.captainCharterId,
          charterName: updated.charterName,
          tripName: updated.tripName,
          date: updated.date.toISOString(),
          startTime: updated.startTime,
          days: updated.days,
          totalPrice: updated.totalPrice,
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

  return NextResponse.json({ ok: true });
}
