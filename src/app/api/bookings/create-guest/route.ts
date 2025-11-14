import { trackEvent } from "@/lib/analytics-service";
import { addDaysUTC, hasConflicts } from "@/lib/booking/overlap";
import { prisma } from "@/lib/database/prisma";
import {
  createPaymentIntent,
  getPaymentFlow,
} from "@/lib/payment/payment-gateway";
import {
  sendBookingCreatedEmail,
  sendBookingReceivedCaptainEmail,
} from "@/lib/services/email-service";
import { calculatePricing } from "@/lib/services/pricing-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * POST /api/bookings/create-guest
 *
 * Create booking for verified guest user.
 * Now creates a User record with GUEST role instead of storing details in Booking model.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      verifiedEmail, // Email that was verified via TAC
      verifiedUserId, // User ID from verification
      firstName,
      lastName,
      phone,
      tripId,
      date,
      days,
      adults,
      children,
      startTime,
      note,
      paymentMethod, // "CARD", "FPX", "EWALLET", "MOCK"
      cardNumber,
      cardExpMonth,
      cardExpYear,
      cardCvv,
    } = body as {
      verifiedEmail?: string;
      verifiedUserId?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      tripId?: string;
      date?: string;
      days?: number;
      adults?: number;
      children?: number;
      startTime?: string;
      note?: string;
      paymentMethod?: string;
      cardNumber?: string;
      cardExpMonth?: string;
      cardExpYear?: string;
      cardCvv?: string;
    };

    // Validate verified email and user ID
    if (!verifiedEmail || !verifiedUserId) {
      return NextResponse.json(
        { error: "Email verification required" },
        { status: 401 }
      );
    }

    // Verify the user exists and is a GUEST
    const guestUser = await prisma.user.findUnique({
      where: { id: verifiedUserId },
      select: { id: true, email: true, role: true, emailVerified: true },
    });

    if (!guestUser) {
      return NextResponse.json(
        { error: "Invalid verification" },
        { status: 401 }
      );
    }

    if (guestUser.email.toLowerCase() !== verifiedEmail.toLowerCase()) {
      return NextResponse.json({ error: "Email mismatch" }, { status: 400 });
    }

    // If user is already registered (ANGLER/ADMIN), they should sign in instead
    if (guestUser.role !== "GUEST") {
      return NextResponse.json(
        { error: "Please sign in to your account to book" },
        { status: 400 }
      );
    }

    // Validate guest details
    if (!firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    // Update GUEST user with latest details
    await prisma.user.update({
      where: { id: verifiedUserId },
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        phone,
      },
    });

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

    // --- PAYMENT METHOD VALIDATION ---
    const validMethods = ["CARD", "FPX", "EWALLET", "MOCK"];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Valid payment method required (CARD, FPX, or EWALLET)" },
        { status: 400 }
      );
    }

    // MOCK payments only in development
    if (paymentMethod === "MOCK" && process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "Mock payments not available in production" },
        { status: 400 }
      );
    }

    // Card payments require card details
    if (paymentMethod === "CARD") {
      if (!cardNumber || !cardExpMonth || !cardExpYear || !cardCvv) {
        return NextResponse.json(
          { error: "Card details required for card payments" },
          { status: 400 }
        );
      }
      const cardNumClean = cardNumber.replace(/\s/g, "");
      if (!/^\d{13,19}$/.test(cardNumClean)) {
        return NextResponse.json(
          { error: "Invalid card number format" },
          { status: 400 }
        );
      }
      if (!/^\d{3,4}$/.test(cardCvv)) {
        return NextResponse.json(
          { error: "Invalid CVV format" },
          { status: 400 }
        );
      }
    }

    // Rate limiting: Max 2 guest bookings per user per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentGuestBookings = await prisma.booking.count({
      where: {
        userId: verifiedUserId,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentGuestBookings >= 2) {
      return NextResponse.json(
        {
          error:
            "Too many bookings in the last hour. Please try again later or create an account for unlimited bookings.",
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

    // Calculate complete pricing breakdown including platform fees and payment gateway fees
    const pricingBreakdown = calculatePricing({
      tripPrice,
      days: ds,
      // TODO: Add promo code support in future
      // promoCode: promoCode ? { code: promoCode, percentage: 10 } : undefined,
    });

    const finalPrice = pricingBreakdown.finalPrice;

    // --- PAYMENT PROCESSING ---
    const paymentFlow = getPaymentFlow(
      paymentMethod as "CARD" | "FPX" | "EWALLET" | "MOCK"
    );
    let paymentResult: any = null;
    let initialStatus: "PAYMENT_PENDING" | "PAID" = "PAYMENT_PENDING";

    // MOCK flow (development only)
    if (paymentMethod === "MOCK") {
      paymentResult = {
        success: true,
        flow: "MOCK",
        paymentIntentId: `mock-${Date.now()}`,
        requiresRedirect: false,
      };
      initialStatus = "PAYMENT_PENDING";
    }
    // TOKENIZED flow (Card)
    else if (paymentFlow === "TOKENIZED") {
      try {
        paymentResult = await createPaymentIntent({
          bookingId: `temp-guest-${Date.now()}`,
          amount: finalPrice,
          paymentMethod: "CARD",
          description: `Booking for ${trip.name} on ${date}`,
          cardDetails: {
            number: cardNumber!.replace(/\s/g, ""),
            cvv: cardCvv!,
            expiryMonth: cardExpMonth!,
            expiryYear: cardExpYear!,
          },
          customerName: `${firstName} ${lastName}`,
          customerEmail: guestUser.email,
          customerPhone: phone,
        });

        if (!paymentResult.success) {
          console.error(
            "❌ Card tokenization failed (guest):",
            paymentResult.error
          );
          return NextResponse.json(
            {
              error: paymentResult.error || "Failed to process card",
            },
            { status: 400 }
          );
        }

        initialStatus = "PAYMENT_PENDING";
      } catch (error: any) {
        console.error("❌ Payment gateway error (guest):", error);
        return NextResponse.json(
          { error: "Payment gateway error" },
          { status: 500 }
        );
      }
    }
    // DIRECT flow (FPX/E-wallet)
    else if (paymentFlow === "DIRECT") {
      initialStatus = "PAYMENT_PENDING"; // Will be updated by callback
    }

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

            // Create booking with GUEST user
            return await tx.booking.create({
              data: {
                userId: verifiedUserId, // Links to GUEST user
                tripId: trip.id,
                charterId: trip.charter.id,
                startTime:
                  trip.startTimes.length > 0 ? (startTime as string) : null,
                date: d,
                days: ds,
                guests: { adults: ad, children: ch } as Prisma.JsonObject,
                tripPrice: pricingBreakdown.subtotal,
                finalPrice: pricingBreakdown.finalPrice,
                platformFee: pricingBreakdown.platformFee,
                captainEarnings: pricingBreakdown.captainEarnings,
                expiresAt,
                status: initialStatus,
                // Payment tracking fields
                paymentMethod: paymentMethod as string,
                paymentFlow: paymentFlow,
                paymentIntentId: paymentResult?.paymentIntentId || null,
                paymentAuthorizedAt:
                  paymentFlow === "TOKENIZED" && paymentResult?.success
                    ? new Date()
                    : null,
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
            userId: guestUser.id,
            anglerName: `${firstName} ${lastName}`,
            anglerEmail: guestUser.email,
            anglerPhone: phone,
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
            paymentMethod: booking.paymentMethod,
            paymentFlow: booking.paymentFlow,
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
          to: guestUser.email,
          userName: firstName,
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
          anglerName: `${firstName} ${lastName}`,
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

    // Track guest booking submission (non-blocking)
    (async () => {
      try {
        const guests = booking.guests as { adults: number; children: number };

        // Fetch charter to get ownerId
        const { getCharterById } = await import(
          "@/lib/services/charter-service"
        );
        const charter = await getCharterById(trip.charter.id);

        await trackEvent({
          eventType: "BOOKING_SUBMITTED",
          charterId: trip.charter.id,
          ownerId: charter?.ownerId,
          metadata: {
            tripId: trip.id,
            tripName: trip.name,
            date: booking.date.toISOString().slice(0, 10),
            days: booking.days,
            adults: guests.adults,
            children: guests.children,
            finalPrice: Number(booking.finalPrice),
            isGuest: true,
          },
        });
      } catch (err) {
        // Silent fail - analytics shouldn't block booking
        console.error("Failed to track guest booking submitted:", err);
      }
    })();

    // Handle DIRECT flow redirect
    if (paymentFlow === "DIRECT" && paymentMethod !== "MOCK") {
      try {
        const directPaymentResult = await createPaymentIntent({
          bookingId: booking.id,
          amount: finalPrice,
          paymentMethod: paymentMethod as "FPX" | "EWALLET",
          description: `Booking for ${trip.name} on ${date}`,
          customerName: `${firstName} ${lastName}`,
          customerEmail: guestUser.email,
          customerPhone: phone,
        });

        if (!directPaymentResult.success || !directPaymentResult.redirectUrl) {
          console.error(
            "❌ Failed to generate payment URL (guest):",
            directPaymentResult.error
          );
          return NextResponse.json(
            {
              error:
                directPaymentResult.error || "Failed to generate payment URL",
            },
            { status: 500 }
          );
        }

        return NextResponse.json(
          {
            booking,
            requiresRedirect: true,
            redirectUrl: directPaymentResult.redirectUrl,
          },
          { status: 201 }
        );
      } catch (error: any) {
        console.error("❌ Direct payment redirect error (guest):", error);
        return NextResponse.json(
          { error: "Failed to process payment" },
          { status: 500 }
        );
      }
    }

    // TOKENIZED or MOCK flow
    return NextResponse.json({ booking }, { status: 201 });
  } catch (e: any) {
    console.error("Guest booking.create error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
