import { auth } from "@/lib/auth/auth";
import { addDaysUTC, hasConflicts } from "@/lib/booking/overlap";
import { prisma } from "@/lib/database/prisma";
import {
  sendBookingCreatedEmail,
  sendBookingReceivedCaptainEmail,
} from "@/lib/services/email-service";
import { createNotification } from "@/lib/services/notification-service";
import { calculateFinalPrice, getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const body = await req.json().catch(() => ({}));

    // Authenticated user flow
    if (session?.user?.id) {
      return await createAuthenticatedBooking(session, body);
    }

    // Guest flow - require verification
    if (!body.verificationToken) {
      return NextResponse.json(
        {
          error: "Guest bookings require email verification",
          requireVerification: true,
        },
        { status: 400 }
      );
    }

    // Redirect to guest booking endpoint
    return NextResponse.json(
      {
        error: "Please use /api/bookings/create-guest for guest bookings",
        redirectTo: "/api/bookings/create-guest",
      },
      { status: 400 }
    );
  } catch (e: any) {
    console.error("booking.create error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function createAuthenticatedBooking(session: any, body: any) {
  try {
    const userId = session.user.id!;
    const {
      tripId, // cuid from captain DB
      date, // YYYY-MM-DD
      days,
      adults,
      children,
      startTime,
      note,
      phone, // Optional: update user phone if provided
    } = body as {
      tripId?: string;
      date?: string;
      days?: number;
      adults?: number;
      children?: number;
      startTime?: string;
      note?: string;
      phone?: string;
    };

    // Basic validation
    if (!tripId || typeof tripId !== "string") {
      return NextResponse.json({ error: "tripId required" }, { status: 400 });
    }

    const d =
      typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(date + "T00:00:00Z")
        : null;
    const ds = Number.isFinite(days as number)
      ? Math.max(1, Math.min(14, Number(days)))
      : 1;
    const ad = Number.isFinite(adults as number)
      ? Math.max(1, Number(adults))
      : 1;
    const ch = Number.isFinite(children as number)
      ? Math.max(0, Number(children))
      : 0;

    if (!d) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    // Ensure local user exists (safety net for legacy OAuth tokens)
    let dbUserId = userId;
    try {
      const canUserQuery =
        typeof (prisma as any)?.user?.findUnique === "function";
      if (canUserQuery) {
        let dbUser = await (prisma as any).user.findUnique({
          where: { id: userId },
        });
        if (!dbUser) {
          const email = (session.user as any)?.email?.toLowerCase?.();
          if (email) {
            dbUser = await (prisma as any).user.findUnique({
              where: { email },
            });
            if (
              !dbUser &&
              typeof (prisma as any)?.user?.create === "function"
            ) {
              // Create user without password (OAuth user)
              dbUser = await (prisma as any).user.create({
                data: {
                  email,
                  name: (session.user as any)?.name ?? undefined,
                },
              });
            }
          }
        }
        if (dbUser?.id) dbUserId = dbUser.id;
      }
    } catch {}

    // Update user phone if provided
    if (phone && typeof phone === "string" && phone.trim()) {
      try {
        await prisma.user.update({
          where: { id: dbUserId },
          data: { phone: phone.trim() },
        });
      } catch (err) {
        console.error("Failed to update user phone:", err);
        // Non-critical, continue with booking
      }
    }

    // Fetch trip data from captain DB
    console.log("🔍 Fetching trip with ID:", tripId);
    const trip = await getTripById(tripId);
    console.log("📦 Trip fetched:", trip ? "SUCCESS" : "NOT FOUND");
    if (trip) {
      console.log("Trip details:", {
        id: trip.id,
        name: trip.name,
        charter: trip.charter.name,
      });
    }

    if (!trip) {
      console.error("❌ Trip not found for ID:", tripId);
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // --- AVAILABILITY: Check for blocked dates (schedule/unavailability) ---
    // Fetch charter schedule and unavailability from captain DB (or API)
    let charterSchedule = null;
    let charterUnavailability = null;
    try {
      // Try to get full charter details (schedule, unavailability)
      // Use charterId from trip.charter.id
      const { getCharterById } = await import("@/lib/services/charter-service");
      const charter = await getCharterById(trip.charter.id);
      charterSchedule = charter?.schedule ?? null;
      charterUnavailability = charter?.unavailability ?? null;
    } catch (e) {
      console.error(
        "[BookingAPI] Failed to fetch charter schedule/unavailability",
        e
      );
    }

    // Calculate blocked dates for the requested range
    if (charterSchedule) {
      const { calculateBlockedDates, formatDateYMD } = await import(
        "@/lib/helpers/availability-helpers"
      );
      const { calculateEndDate } = await import(
        "@/lib/helpers/date-range-helpers"
      );
      const startDate = d;
      const endDateStr = calculateEndDate(formatDateYMD(d), ds);
      const endDate = new Date(endDateStr + "T00:00:00Z");
      const blockedDates = calculateBlockedDates(
        charterSchedule,
        charterUnavailability,
        [], // Booked dates handled by conflict logic below
        startDate,
        endDate
      );
      // Check if any requested date is blocked
      let blocked = false;
      for (let i = 0; i < ds; i++) {
        const checkDate = new Date(startDate);
        checkDate.setUTCDate(checkDate.getUTCDate() + i);
        const checkDateStr = formatDateYMD(checkDate);
        if (blockedDates.has(checkDateStr)) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        return NextResponse.json(
          {
            error:
              "Selected date(s) are not available due to non-operational days or unavailability. Please choose a different date.",
          },
          { status: 409 }
        );
      }
    }

    // If trip defines start times, require one selection
    if (trip.startTimes.length > 0) {
      const st = typeof startTime === "string" ? startTime : undefined;
      if (!st || !trip.startTimes.includes(st)) {
        return NextResponse.json(
          { error: "startTime required" },
          { status: 400 }
        );
      }
    }

    // IMPORTANT: Use normal price (not promo price) for booking submission
    const tripPrice = trip.price; // Always use base price, never promoPrice
    const finalPrice = calculateFinalPrice({
      tripPrice,
      days: ds,
    });

    // Hold expires in 12 hours
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

    // Availability guard: prevent overlapping bookings for the same charter
    // Only PAID bookings block dates (confirmed and paid bookings)
    const blockingStatuses = ["PAID"] as const;

    const newStart = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    );
    const newEnd = addDaysUTC(newStart, ds - 1);

    // Retry configuration for handling race conditions
    const MAX_RETRIES = 3;
    const INITIAL_BACKOFF_MS = 100;

    let lastError: any;
    let booking;

    // Retry loop with transaction to prevent double bookings
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Use transaction with serializable isolation to prevent race conditions
        booking = await prisma.$transaction(
          async (tx) => {
            // Fetch candidates in a coarse window (within transaction)
            const candidates = await tx.booking.findMany({
              where: {
                charterId: trip.charter.id,
                status: { in: blockingStatuses as any },
                date: { lte: newEnd, gte: addDaysUTC(newStart, -31) },
              },
              select: { id: true, date: true, days: true, startTime: true },
            });

            const conflicts = hasConflicts(candidates, newStart, ds, {
              usesStartTimes: trip.startTimes.length > 0,
              selectedStartTime:
                trip.startTimes.length > 0 ? (startTime as string) : null,
            });

            if (conflicts) {
              throw new Error("BOOKING_CONFLICT");
            }

            // Create booking atomically
            return await tx.booking.create({
              data: {
                userId: dbUserId,
                tripId: trip.id,
                charterId: trip.charter.id,
                date: d,
                days: ds,
                startTime:
                  trip.startTimes.length > 0 ? (startTime as string) : null,
                guests: { adults: ad, children: ch } as Prisma.JsonObject,
                tripPrice: tripPrice,
                finalPrice: finalPrice,
                expiresAt,
                note:
                  typeof note === "string" && note.trim()
                    ? note.trim()
                    : undefined,
              },
            });
          },
          {
            isolationLevel: "Serializable", // Strongest isolation level
            maxWait: 5000, // Wait up to 5s for lock
            timeout: 10000, // Transaction timeout 10s
          }
        );

        // Success - exit retry loop
        break;
      } catch (error: any) {
        lastError = error;

        // Handle booking conflict
        if (error.message === "BOOKING_CONFLICT") {
          return NextResponse.json(
            {
              error:
                "Selected dates/time are no longer available. Please choose a different selection.",
            },
            { status: 409 }
          );
        }

        // Handle unique constraint violation (P2002)
        if (error.code === "P2002") {
          console.warn(
            `⚠️ Unique constraint violation on attempt ${attempt}/${MAX_RETRIES}`,
            {
              charterId: trip.charter.id,
              date: d.toISOString().split("T")[0],
              startTime: trip.startTimes.length > 0 ? startTime : null,
            }
          );

          // If this was the last attempt, return conflict error
          if (attempt === MAX_RETRIES) {
            return NextResponse.json(
              {
                error:
                  "This date/time was just booked by another angler. Please try a different selection.",
              },
              { status: 409 }
            );
          }

          // Exponential backoff before retry
          await new Promise((resolve) =>
            setTimeout(resolve, INITIAL_BACKOFF_MS * attempt)
          );
          continue;
        }

        // Handle transaction timeout or deadlock
        if (
          error.code === "P2034" ||
          error.message?.includes("transaction") ||
          error.message?.includes("deadlock")
        ) {
          console.warn(
            `⚠️ Transaction error on attempt ${attempt}/${MAX_RETRIES}:`,
            error.message
          );

          if (attempt === MAX_RETRIES) {
            return NextResponse.json(
              {
                error:
                  "Unable to process booking due to high demand. Please try again.",
              },
              { status: 503 }
            );
          }

          // Backoff before retry
          await new Promise((resolve) =>
            setTimeout(resolve, INITIAL_BACKOFF_MS * attempt)
          );
          continue;
        }

        // Unknown error - rethrow
        throw error;
      }
    }

    // If we somehow exit the loop without a booking, return error
    if (!booking) {
      console.error("❌ Booking creation failed after retries:", lastError);
      return NextResponse.json(
        { error: "Failed to create booking. Please try again." },
        { status: 500 }
      );
    }

    // Outbound webhook to captain app (non-blocking)
    try {
      const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
      const hookSecret = process.env.CAPTAIN_API_SECRET;
      if (hookUrl && hookSecret) {
        const guests = booking.guests as { adults: number; children: number };
        const payload = {
          type: "booking.created",
          booking: {
            id: booking.id,
            tripId: booking.tripId,
            charterId: booking.charterId,
            startTime: booking.startTime,
            date: booking.date.toISOString(),
            days: booking.days,
            adults: guests.adults,
            children: guests.children,
            tripPrice: Number(booking.tripPrice),
            finalPrice: Number(booking.finalPrice),
            expiresAt: booking.expiresAt.toISOString(),
            status: booking.status,
          },
        };
        // Best-effort retry
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
        console.log("🔔 Creating notification for user:", dbUserId);
        const notification = await createNotification({
          userId: dbUserId,
          type: "BOOKING_CREATED",
          title: "Booking Request Submitted! 🎣",
          message: `Your booking request for ${trip.charter.name} has been sent to the captain. You'll be notified once they review it.`,
          actionUrl: `/book/confirm?id=${booking.id}`,
          actionLabel: "View Booking",
          bookingId: booking.id,
          charterId: trip.charter.id,
          metadata: {
            charterName: trip.charter.name,
            tripName: trip.name,
            tripDate: booking.date.toISOString().slice(0, 10),
          },
        });
        console.log("✅ Notification created:", notification.id);
      } catch (err) {
        console.error("❌ Failed to create booking notification:", err);
        console.error("Error details:", {
          name: (err as Error).name,
          message: (err as Error).message,
          stack: (err as Error).stack,
        });
      }
    })();

    // Email the angler (non-blocking best-effort)
    (async () => {
      try {
        const user = await prisma.user.findUnique({ where: { id: dbUserId } });
        if (!user?.email) return;
        const base =
          process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
        const confirmationUrl = `${base}/book/confirm?id=${encodeURIComponent(
          booking.id
        )}`;

        await sendBookingCreatedEmail({
          to: user.email,
          userName: user.name ?? "there",
          charterName: trip.charter.name,
          tripName: trip.name,
          tripDate: booking.date.toISOString().slice(0, 10),
          tripDays: booking.days,
          durationHours: trip.durationHours,
          startTime: booking.startTime ?? undefined,
          totalPrice: `RM ${Number(booking.finalPrice).toFixed(2)}`,
          confirmationUrl,
        });
      } catch (err) {
        console.error("Failed to send booking created email:", err);
      }
    })();

    // Email the captain (non-blocking best-effort)
    (async () => {
      try {
        const captain = trip.charter.captain;
        if (!captain?.email) {
          console.warn("Captain email not available for booking:", booking.id);
          return;
        }

        const user = await prisma.user.findUnique({ where: { id: dbUserId } });
        const anglerName = user?.name ?? "Guest";

        const captainBaseUrl =
          process.env.FISHON_CAPTAIN_API_URL || "http://localhost:3000";
        const bookingUrl = `${captainBaseUrl}/captain/bookings/${encodeURIComponent(
          booking.id
        )}`;

        await sendBookingReceivedCaptainEmail({
          to: captain.email,
          captainName: captain.displayName,
          charterName: trip.charter.name,
          anglerName: anglerName,
          tripName: trip.name,
          tripDate: booking.date.toISOString().slice(0, 10),
          tripDays: booking.days,
          durationHours: trip.durationHours,
          startTime: booking.startTime ?? undefined,
          totalPrice: `RM ${Number(booking.finalPrice).toFixed(2)}`,
          bookingUrl,
        });
      } catch (err) {
        console.error("Failed to send captain booking email:", err);
      }
    })();

    return NextResponse.json({ booking }, { status: 201 });
  } catch (e: any) {
    console.error("authenticated booking.create error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
