import { trackEvent } from "@/lib/analytics-service";
import { calculateTimeSlots } from "@/lib/booking/booking-time";
import { addDaysUTC, hasConflicts } from "@/lib/booking/overlap";
import { prisma } from "@/lib/database/prisma";
import {
  getAdvanceBookingHours,
  getMinimumBookableDate,
} from "@/lib/helpers/booking-helpers";
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
import { revalidatePath } from "next/cache";
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
      emergencyName, // Emergency contact fields
      emergencyPhone,
      emergencyRelation,
      participants, // Participant list
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
      promoCode, // NEW: Promo codes not allowed for guests
    } = body as {
      verifiedEmail?: string;
      verifiedUserId?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      emergencyName?: string;
      emergencyPhone?: string;
      emergencyRelation?: string;
      participants?: Array<{ name: string; phone: string; isBooker?: boolean }>;
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
      promoCode?: string;
    };

    // GUESTS CANNOT USE PROMO CODES - MUST REGISTER
    if (promoCode && typeof promoCode === "string" && promoCode.trim()) {
      return NextResponse.json(
        {
          error:
            "Promo codes are only available for registered users. Please create an account to use promo codes.",
          requiresRegistration: true,
        },
        { status: 403 }
      );
    }

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

    // Update GUEST user with latest details and emergency contact
    const userUpdates: any = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      phone,
    };

    if (emergencyName) userUpdates.emergencyName = emergencyName;
    if (emergencyPhone) userUpdates.emergencyPhone = emergencyPhone;
    if (emergencyRelation) userUpdates.emergencyRelation = emergencyRelation;

    await prisma.user.update({
      where: { id: verifiedUserId },
      data: userUpdates,
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

    // Validate advance booking requirement (server-side enforcement)
    // This ensures the booking date meets the minimum advance booking policy
    // Use tripType as proxy for charter type (e.g., "offshore" requires 72h advance)
    const tripTypeForAdvance = trip.tripType;
    const minBookableDate = getMinimumBookableDate(tripTypeForAdvance);
    const advanceHours = getAdvanceBookingHours(tripTypeForAdvance);
    const bookingDate = new Date(d);
    bookingDate.setHours(0, 0, 0, 0);

    if (bookingDate < minBookableDate) {
      console.log("❌ [GUEST] Advance booking check failed:", {
        bookingDate: bookingDate.toISOString(),
        minBookableDate: minBookableDate.toISOString(),
        tripType: tripTypeForAdvance,
        advanceHours,
      });
      return NextResponse.json(
        {
          error: `Bookings must be made at least ${advanceHours} hours in advance. Please select a later date.`,
          minBookableDate: minBookableDate.toISOString().slice(0, 10),
        },
        { status: 400 }
      );
    }

    // Use override price if set by admin, otherwise base price
    const tripPrice = trip.priceOverride ?? trip.price;

    // Get charter's booking flow type
    const { getCharterFlowType } = await import(
      "@/lib/services/charter-service"
    );
    const bookingFlowType = await getCharterFlowType(trip.charter.id);

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

    // Calculate complete pricing breakdown including platform fees and payment gateway fees
    const pricingBreakdown = calculatePricing({
      tripPrice,
      days: ds,
      // TODO: Add promo code support in future
      // promoCode: promoCode ? { code: promoCode, percentage: 10 } : undefined,
    });

    const finalPrice = pricingBreakdown.finalPrice;

    // --- FLOW-SPECIFIC LOGIC ---
    let paymentFlow: string | null = null;
    let paymentResult: any = null;
    let initialStatus:
      | "PENDING"
      | "PAYMENT_AUTHORIZED"
      | "PAID"
      | "AWAITING_PAYMENT" = "PENDING";
    let expiresAt: Date;
    let approvalDeadline: Date | null = null;

    // MANUAL FLOW: No payment processing, create PENDING booking
    if (bookingFlowType === "MANUAL") {
      // Manual flow doesn't require payment method
      initialStatus = "PENDING";

      // Get approval deadline (default 24 hours)
      const { getCharterApprovalTimeHours } = await import(
        "@/lib/services/charter-service"
      );
      const approvalHours = await getCharterApprovalTimeHours(trip.charter.id);
      const manualSlaHours = Number.isFinite(approvalHours)
        ? Number(approvalHours)
        : 24;
      approvalDeadline = new Date(Date.now() + manualSlaHours * 60 * 60 * 1000);
      expiresAt = approvalDeadline; // Booking expires if not approved

      paymentFlow = null; // No payment yet
      paymentResult = null;
    }
    // AUTO FLOW: Process payment immediately
    else {
      // --- PAYMENT METHOD VALIDATION (AUTO FLOW ONLY) ---
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

      paymentFlow = getPaymentFlow(
        paymentMethod as "CARD" | "FPX" | "EWALLET" | "MOCK"
      );
      initialStatus = "PAYMENT_AUTHORIZED";
      expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hour hold for payment

      // DIRECT PAYMENT (FPX/E-WALLET): Create payment session instead of booking
      // Booking will be created after payment callback confirms success
      if (paymentMethod === "FPX" || paymentMethod === "EWALLET") {
        // Calculate timeSlots for DIRECT flow - needed for conflict detection in callback
        const directFlowTimeSlots = calculateTimeSlots({
          date: d,
          startTime:
            trip.startTimes.length > 0 ? (startTime as string) : "08:00",
          durationHours: trip.durationHours,
          days: ds,
        });

        // Create payment session with booking data
        const paymentSession = await prisma.paymentSession.create({
          data: {
            userId: verifiedUserId,
            amount: finalPrice,
            paymentMethod,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
            bookingData: {
              tripId: trip.id,
              charterId: trip.charter.id,
              date: d.toISOString(),
              days: ds,
              startTime: trip.startTimes.length > 0 ? startTime : null,
              timeSlots: directFlowTimeSlots, // Include for conflict detection and booking creation
              adults: ad,
              children: ch,
              phone,
              emergencyName,
              emergencyPhone,
              emergencyRelation,
              participants,
              note,
              pricingBreakdown: JSON.parse(JSON.stringify(pricingBreakdown)),
              guestInfo: {
                firstName,
                lastName,
                email: guestUser.email,
              },
            } as any,
          },
        });

        // Generate payment URL
        const directPaymentResult = await createPaymentIntent({
          bookingId: paymentSession.id, // Use session ID as order_id
          amount: finalPrice,
          paymentMethod: paymentMethod as "FPX" | "EWALLET",
          description: `Booking for ${trip.name} on ${d.toISOString().split("T")[0]}`,
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

        // Return redirect URL - no booking created yet
        return NextResponse.json(
          {
            sessionId: paymentSession.id,
            requiresRedirect: true,
            redirectUrl: directPaymentResult.redirectUrl,
          },
          { status: 200 }
        );
      }

      // MOCK flow (development only)
      if (paymentMethod === "MOCK") {
        paymentResult = {
          success: true,
          flow: "MOCK",
          paymentIntentId: `mock-${Date.now()}`,
          requiresRedirect: false,
        };
        initialStatus = "PAYMENT_AUTHORIZED";
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

          initialStatus = "PAYMENT_AUTHORIZED";
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
        // DIRECT flow: User redirected to payment gateway, status updated via callback
        initialStatus = "PAYMENT_AUTHORIZED"; // Will be updated by callback to PAID
      }
    } // End AUTO flow payment processing

    // Availability guard: prevent overlapping bookings
    // Manual flow blocks pending/awaiting bookings, auto flow blocks paid
    const manualBlockingStatuses = [
      "PENDING",
      "AWAITING_PAYMENT",
      "PAYMENT_AUTHORIZED",
      "PAID",
      "COMPLETED",
    ] as const;
    // AUTO flow: blocks PAYMENT_AUTHORIZED (CARD payments with token) and PAID
    // Note: DIRECT payments (FPX/E-Wallet) go through PaymentSession (checked separately below)
    const autoBlockingStatuses = ["PAYMENT_AUTHORIZED", "PAID"] as const;
    const blockingStatuses =
      bookingFlowType === "MANUAL"
        ? manualBlockingStatuses
        : autoBlockingStatuses;

    const newStart = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    );
    const newEnd = addDaysUTC(newStart, ds - 1);

    // Retry configuration for handling race conditions
    const MAX_RETRIES = 3;
    const INITIAL_BACKOFF_MS = 100;

    let lastError: any;
    let booking;

    // Calculate timeSlots for new booking
    const newTimeSlots = calculateTimeSlots({
      date: d,
      startTime: trip.startTimes.length > 0 ? (startTime as string) : "08:00",
      durationHours: trip.durationHours,
      days: ds,
    });

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
              select: {
                id: true,
                date: true,
                days: true,
                startTime: true,
                timeSlots: true,
              },
            });

            let conflicts = hasConflicts(candidates, newStart, ds, {
              usesStartTimes: trip.startTimes.length > 0,
              selectedStartTime:
                trip.startTimes.length > 0 ? (startTime as string) : null,
              newTimeSlots: newTimeSlots,
            });

            // Also check pending PaymentSessions (DIRECT payments in progress)
            // This prevents double-booking when two users are paying via FPX/E-Wallet simultaneously
            if (!conflicts && bookingFlowType === "AUTO") {
              const pendingSessions = await tx.paymentSession.findMany({
                where: {
                  status: "PENDING",
                  expiresAt: { gt: new Date() },
                },
                select: {
                  id: true,
                  bookingData: true,
                },
              });

              // Filter sessions for this charter and check for overlaps
              for (const session of pendingSessions) {
                const sessionData = session.bookingData as any;
                if (sessionData?.charterId !== trip.charter.id) continue;

                const sessionDate = new Date(sessionData.date);
                const sessionDays = sessionData.days || 1;
                const sessionStart = new Date(
                  Date.UTC(
                    sessionDate.getUTCFullYear(),
                    sessionDate.getUTCMonth(),
                    sessionDate.getUTCDate()
                  )
                );

                const sessionConflict = hasConflicts(
                  [
                    {
                      date: sessionStart,
                      days: sessionDays,
                      startTime: sessionData.startTime || null,
                      timeSlots: sessionData.timeSlots,
                    },
                  ],
                  newStart,
                  ds,
                  {
                    usesStartTimes: trip.startTimes.length > 0,
                    selectedStartTime:
                      trip.startTimes.length > 0 ? (startTime as string) : null,
                    newTimeSlots: newTimeSlots,
                  }
                );

                if (sessionConflict) {
                  conflicts = true;
                  console.log(
                    "📍 [GUEST BOOKING CREATE] PaymentSession conflict detected",
                    {
                      sessionId: session.id,
                      charterId: trip.charter.id,
                      date: d.toISOString(),
                    }
                  );
                  break;
                }
              }
            }

            if (conflicts) {
              throw new Error("BOOKING_CONFLICT");
            }

            // Create booking with GUEST user
            // Build guests JSON with participants list and emergency contact
            const guestsData: any = {
              adults: ad,
              children: ch,
            };

            // Add participants if provided
            if (Array.isArray(participants) && participants.length > 0) {
              guestsData.participants = participants.map((p: any) => ({
                name: p.name,
                phone: p.phone,
                isBooker: p.isBooker || false,
              }));
            }

            // Add emergency contact if provided
            if (
              emergencyName &&
              typeof emergencyName === "string" &&
              emergencyName.trim() &&
              emergencyPhone &&
              typeof emergencyPhone === "string" &&
              emergencyPhone.trim()
            ) {
              guestsData.emergencyContact = {
                name: emergencyName.trim(),
                phone: emergencyPhone.trim(),
                relationship:
                  emergencyRelation &&
                  typeof emergencyRelation === "string" &&
                  emergencyRelation.trim()
                    ? emergencyRelation.trim()
                    : "Not specified",
              };
            }

            return await tx.booking.create({
              data: {
                userId: verifiedUserId, // Links to GUEST user
                tripId: trip.id,
                charterId: trip.charter.id,
                startTime:
                  trip.startTimes.length > 0 ? (startTime as string) : null,
                date: d,
                days: ds,
                timeSlots: newTimeSlots as unknown as Prisma.JsonArray,
                guests: guestsData as Prisma.JsonObject,
                tripPrice: pricingBreakdown.tripPrice, // Base price per day, not subtotal
                finalPrice: pricingBreakdown.finalPrice,
                platformFee: pricingBreakdown.platformFee,
                serviceFee: pricingBreakdown.serviceFee,
                captainEarnings: pricingBreakdown.captainEarnings,
                expiresAt,
                status: initialStatus,
                bookingFlowType: bookingFlowType,
                approvalDeadline:
                  bookingFlowType === "MANUAL" ? approvalDeadline : null, // Manual flow
                acknowledgmentDeadline:
                  bookingFlowType === "AUTO" ? expiresAt : null, // Auto flow
                // Payment tracking fields (null for Manual flow pending bookings)
                paymentMethod: (paymentMethod as string) || null,
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

    // Create conversation for this booking (non-blocking best-effort)
    (async () => {
      try {
        // Only create conversation if charter owner exists
        if (!trip.charter.ownerId) {
          console.warn(
            "⚠️ Skipping conversation creation - charter owner not found"
          );
          return;
        }

        const { createConversation, unlockConversation } = await import(
          "@/lib/services/message-service"
        );

        // Create conversation with correct parameters
        const conversation = await createConversation(
          booking.id,
          verifiedUserId,
          String(trip.charter.id),
          String(trip.charter.ownerId) // ownerId (User.id of charter owner)
        );

        console.log("✅ Conversation created for guest booking:", {
          bookingId: booking.id,
          conversationId: conversation.id,
          initialStatus: conversation.status,
          bookingFlowType,
          paymentFlow,
        });

        // Unlock conversation only for TOKENIZED flow (card pre-authorized)
        // DIRECT flow (FPX/E-wallet) stays locked until callback confirms payment
        if (bookingFlowType === "AUTO" && paymentFlow === "TOKENIZED") {
          await unlockConversation(conversation.id);
          console.log("✅ Conversation unlocked for TOKENIZED payment:", {
            conversationId: conversation.id,
            bookingId: booking.id,
          });
        } else if (paymentFlow === "DIRECT") {
          console.log(
            "🔒 Conversation stays locked for DIRECT payment until callback confirms:",
            {
              conversationId: conversation.id,
              bookingId: booking.id,
            }
          );
        }
      } catch (err) {
        console.error(
          "❌ Failed to create conversation for guest booking:",
          err
        );
        // Non-critical - booking is still valid
      }
    })();

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
            charterName: trip.charter.name,
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
            bookingFlowType: booking.bookingFlowType,
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
        const confirmationUrl = `${base}/ms/book/confirm?id=${encodeURIComponent(
          booking.id
        )}`;

        // Different email based on flow type
        if (bookingFlowType === "MANUAL") {
          // Manual flow: "Request received, awaiting approval"
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
            paymentFlow: undefined, // No payment yet
            userId: guestUser.id,
            bookingId: booking.id,
          });
        } else {
          // Auto flow: "Payment received"
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
            paymentFlow: booking.paymentFlow as
              | "TOKENIZED"
              | "DIRECT"
              | undefined,
            userId: guestUser.id,
            bookingId: booking.id,
          });
        }
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

        // Manual flow: Captain needs to approve
        // Auto flow: Captain needs to acknowledge payment
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
          bookingId: booking.id,
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

    // Revalidate relevant pages after booking creation
    try {
      // Fetch conversation ID for this booking
      const conversation = await prisma.conversation.findUnique({
        where: { bookingId: booking.id },
        select: { id: true },
      });

      // Revalidate confirmation page for all locales (guest doesn't have /account/bookings)
      const locales = ["ms", "en"];
      for (const locale of locales) {
        revalidatePath(`/${locale}/book/confirm`);
      }

      // Revalidate message page if conversation exists
      if (conversation) {
        for (const locale of locales) {
          revalidatePath(`/${locale}/account/messages/${conversation.id}`);
        }
      }
    } catch (revalidateErr) {
      console.warn(
        "⚠️ Failed to revalidate paths after guest booking creation:",
        revalidateErr
      );
      // Non-critical error - continue with response
    }

    // Handle DIRECT flow redirect (AUTO flow only)
    if (
      bookingFlowType === "AUTO" &&
      paymentFlow === "DIRECT" &&
      paymentMethod !== "MOCK"
    ) {
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
