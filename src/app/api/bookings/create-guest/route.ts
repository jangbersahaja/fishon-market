import { addDaysUTC, hasConflicts } from "@/lib/booking/overlap";
import { prisma } from "@/lib/database/prisma";
import {
  sendBookingCreatedEmail,
  sendBookingReceivedCaptainEmail,
} from "@/lib/services/email-service";
import { calculateFinalPrice, getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { Prisma } from "@prisma/client";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

/**
 * POST /api/bookings/create-guest
 *
 * Create booking for verified guest user.
 * Requires verification token from /api/bookings/verify-code.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      verificationToken,
      guestFirstName,
      guestLastName,
      guestEmail,
      guestPhone,
      tripId, // Changed from charterId/tripIndex
      date,
      days,
      adults,
      children,
      startTime,
      note,
    } = body as {
      verificationToken?: string;
      guestFirstName?: string;
      guestLastName?: string;
      guestEmail?: string;
      guestPhone?: string;
      tripId?: string; // Changed
      date?: string;
      days?: number;
      adults?: number;
      children?: number;
      startTime?: string;
      note?: string;
    };

    // Validate verification token
    if (!verificationToken) {
      return NextResponse.json(
        { error: "Verification token required" },
        { status: 401 }
      );
    }

    // Verify JWT token
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "dev-secret"
    );
    let verifiedEmail: string;
    try {
      const { payload } = await jwtVerify(verificationToken, secret);
      if (payload.purpose !== "guest_booking") {
        throw new Error("Invalid token purpose");
      }
      verifiedEmail = String(payload.email);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 401 }
      );
    }

    // Validate guest details
    if (!guestFirstName || !guestLastName || !guestEmail || !guestPhone) {
      return NextResponse.json(
        { error: "All guest details are required" },
        { status: 400 }
      );
    }

    // Ensure verified email matches provided email
    if (guestEmail.toLowerCase() !== verifiedEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "Email mismatch with verification token" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate name format (prevent injection)
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(guestFirstName) || !nameRegex.test(guestLastName)) {
      return NextResponse.json(
        { error: "Invalid name format" },
        { status: 400 }
      );
    }

    // Basic booking validation
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

    // Rate limiting: Max 2 guest bookings per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentGuestBookings = await prisma.booking.count({
      where: {
        guestEmail: guestEmail.toLowerCase(),
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentGuestBookings >= 2) {
      return NextResponse.json(
        {
          error:
            "Too many bookings from this email. Please try again in an hour or create an account for unlimited bookings.",
        },
        { status: 429 }
      );
    }

    // Fetch trip snapshot with charter data from captain DB
    const trip = await getTripById(tripId);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
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

    // Calculate pricing - IMPORTANT: Use normal price (not promo price)
    const tripPrice = trip.price; // Always use base price, never promoPrice
    const finalPrice = calculateFinalPrice({ tripPrice, days: ds });

    // Hold expires in 12 hours
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

    // Availability guard: prevent overlapping bookings
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

            // Create guest booking atomically
            return await tx.booking.create({
              data: {
                // No userId for guest bookings
                guestFirstName,
                guestLastName,
                guestEmail: guestEmail.toLowerCase(),
                guestPhone,
                emailVerified: true, // Email was verified via token
                tripId: trip.id,
                charterId: trip.charter.id,
                startTime:
                  trip.startTimes.length > 0 ? (startTime as string) : null,
                date: d,
                days: ds,
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
      console.error(
        "❌ Guest booking creation failed after retries:",
        lastError
      );
      return NextResponse.json(
        { error: "Failed to create booking. Please try again." },
        { status: 500 }
      );
    }

    // Outbound webhook to captain app (non-blocking)
    try {
      const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
      const hookSecret = process.env.CAPTAIN_API_SECRET;
      console.log("📤 [WEBHOOK] Preparing to send booking.created webhook", {
        hookUrl,
        hasSecret: !!hookSecret,
        bookingId: booking.id,
        charterId: booking.charterId,
      });

      if (hookUrl && hookSecret) {
        const guests = booking.guests as { adults: number; children: number };
        const payload = {
          type: "booking.created",
          booking: {
            id: booking.id,
            guestName: `${guestFirstName} ${guestLastName}`,
            guestEmail,
            guestPhone,
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
        console.log("🚀 [WEBHOOK] Sending webhook to captain app...");
        sendWithRetry(hookUrl, payload, {
          headers: { "x-captain-secret": hookSecret },
          attempts: 3,
          baseDelayMs: 300,
        });
      } else {
        console.warn("⚠️ [WEBHOOK] Skipping webhook - missing URL or secret");
      }
    } catch (webhookError) {
      console.error("❌ [WEBHOOK] Failed to send webhook:", webhookError);
    }

    // Email the guest (non-blocking best-effort)
    (async () => {
      try {
        const base =
          process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
        const confirmationUrl = `${base}/book/confirm?id=${encodeURIComponent(
          booking.id
        )}`;

        await sendBookingCreatedEmail({
          to: guestEmail,
          userName: guestFirstName,
          charterName: trip.charter.name,
          tripName: trip.name,
          tripDate: booking.date.toISOString().slice(0, 10),
          tripDays: booking.days,
          durationHours: trip.durationHours,
          startTime: booking.startTime ?? undefined,
          totalPrice: `RM ${Number(booking.finalPrice).toFixed(2)}`,
          confirmationUrl,
        });
      } catch (emailErr) {
        console.error("Failed to send guest booking email:", emailErr);
      }
    })();

    // Email the captain (non-blocking best-effort)
    (async () => {
      try {
        const captain = trip.charter.captain;
        if (!captain?.email) {
          console.warn(
            "Captain email not available for guest booking:",
            booking.id
          );
          return;
        }

        const captainBaseUrl =
          process.env.FISHON_CAPTAIN_API_URL || "http://localhost:3000";
        const bookingUrl = `${captainBaseUrl}/captain/bookings/${encodeURIComponent(
          booking.id
        )}`;

        await sendBookingReceivedCaptainEmail({
          to: captain.email,
          captainName: captain.displayName,
          charterName: trip.charter.name,
          anglerName: `${guestFirstName} ${guestLastName}`,
          tripName: trip.name,
          tripDate: booking.date.toISOString().slice(0, 10),
          tripDays: booking.days,
          durationHours: trip.durationHours,
          startTime: booking.startTime ?? undefined,
          totalPrice: `RM ${Number(booking.finalPrice).toFixed(2)}`,
          bookingUrl,
        });
      } catch (emailErr) {
        console.error("Failed to send captain booking email:", emailErr);
      }
    })();

    return NextResponse.json({ booking }, { status: 201 });
  } catch (e: any) {
    console.error("Guest booking.create error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
