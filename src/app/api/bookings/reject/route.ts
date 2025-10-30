import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { sendBookingRejectedEmail } from "@/lib/services/email-service";
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
    const { id, reason } = body as { id?: string; reason?: string };
    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (booking.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending bookings can be rejected" },
        { status: 409 }
      );
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason || null,
        captainDecisionAt: new Date(),
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
        rejectionReason: true,
      },
    });

    // Notify captain app (best-effort)
    try {
      const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
      const hookSecret = process.env.CAPTAIN_WEBHOOK_SECRET;
      if (hookUrl && hookSecret) {
        const payload = {
          type: "booking.rejected",
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
          await createNotification({
            userId: recipientUserId,
            type: "BOOKING_REJECTED",
            title: "Booking Update",
            message: `Unfortunately, ${trip.charter.name} couldn't accommodate your booking request.${updated.rejectionReason ? ` Reason: ${updated.rejectionReason}` : ""}`,
            actionUrl: `/search`,
            actionLabel: "Find Other Charters",
            bookingId: updated.id,
            charterId: updated.charterId,
            metadata: {
              charterName: trip.charter.name,
              reason: updated.rejectionReason ?? undefined,
            },
          });
        }
      } catch (err) {
        console.error("Failed to create booking rejected notification:", err);
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
          const searchUrl = `${base}/search`;

          await sendBookingRejectedEmail({
            to: email,
            userName: name ?? "there",
            charterName: trip.charter.name,
            reason: updated.rejectionReason ?? undefined,
            searchUrl,
          });
        }
      }
    } catch (err) {
      console.error("Failed to send booking rejected email:", err);
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
    console.error("booking.reject error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
