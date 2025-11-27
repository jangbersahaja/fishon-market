import { trackEvent } from "@/lib/analytics-service";
import { auth } from "@/lib/auth/auth";
import { calculateTimeSlots } from "@/lib/booking/booking-time";
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
import {
  createConversation,
  sendMessage,
  unlockConversation,
} from "@/lib/services/message-service";
import { bookingCreatedMessage } from "@/lib/services/message-templates";
import { createNotification } from "@/lib/services/notification-service";
import { calculatePricing } from "@/lib/services/pricing-service";
import {
  markPromoCodeUsed,
  validatePromoCode,
} from "@/lib/services/promo-service";
import { sendCaptainBookingReceivedSMS } from "@/lib/services/sms-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
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
      emergencyName, // Emergency contact fields
      emergencyPhone,
      emergencyRelation,
      participants, // Participant list
      paymentMethod, // NEW: "CARD", "FPX", "EWALLET", "MOCK"
      cardNumber, // Card details for TOKENIZED flow
      cardExpMonth,
      cardExpYear,
      cardCvv,
      promoCode, // NEW: Promo code for discount
    } = body as {
      tripId?: string;
      date?: string;
      days?: number;
      adults?: number;
      children?: number;
      startTime?: string;
      note?: string;
      phone?: string;
      emergencyName?: string;
      emergencyPhone?: string;
      emergencyRelation?: string;
      participants?: Array<{ name: string; phone: string; isBooker?: boolean }>;
      paymentMethod?: string;
      cardNumber?: string;
      cardExpMonth?: string;
      cardExpYear?: string;
      cardCvv?: string;
      promoCode?: string;
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

    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today in local time
    const bookingDate = new Date(d);
    bookingDate.setHours(0, 0, 0, 0);

    if (bookingDate <= today) {
      return NextResponse.json(
        {
          error:
            "Cannot book for today or past dates. Please select a future date.",
        },
        { status: 400 }
      );
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

    // Update user phone and emergency contact if provided
    const userUpdates: any = {};
    if (phone && typeof phone === "string" && phone.trim()) {
      userUpdates.phone = phone.trim();
    }
    if (
      emergencyName &&
      typeof emergencyName === "string" &&
      emergencyName.trim()
    ) {
      userUpdates.emergencyName = emergencyName.trim();
    }
    if (
      emergencyPhone &&
      typeof emergencyPhone === "string" &&
      emergencyPhone.trim()
    ) {
      userUpdates.emergencyPhone = emergencyPhone.trim();
    }
    if (
      emergencyRelation &&
      typeof emergencyRelation === "string" &&
      emergencyRelation.trim()
    ) {
      userUpdates.emergencyRelation = emergencyRelation.trim();
    }

    if (Object.keys(userUpdates).length > 0) {
      try {
        await prisma.user.update({
          where: { id: dbUserId },
          data: userUpdates,
        });
      } catch (err) {
        console.error("Failed to update user details:", err);
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

    // Use override price if set by admin, otherwise base price
    const tripPrice = trip.priceOverride ?? trip.price;

    // Validate and apply promo code if provided
    let validatedPromo: {
      promoCodeId: string;
      discountAmount: number;
      percentage: number;
    } | null = null;

    if (promoCode && typeof promoCode === "string" && promoCode.trim()) {
      try {
        const promoValidation = await validatePromoCode({
          code: promoCode.trim(),
          userId: dbUserId,
          charterId: trip.charter.id,
          subtotal: tripPrice * ds, // Calculate subtotal for validation
        });

        if (promoValidation.valid && promoValidation.discount) {
          validatedPromo = {
            promoCodeId: promoValidation.promoCodeId!,
            discountAmount: promoValidation.discount.amount,
            percentage: promoValidation.discount.percentage || 0,
          };
          console.log("✅ Promo code validated:", {
            code: promoCode,
            discount: validatedPromo.discountAmount,
            percentage: validatedPromo.percentage,
          });
        } else {
          console.warn("⚠️ Invalid promo code:", promoValidation.error);
          return NextResponse.json(
            { error: promoValidation.error || "Invalid promo code" },
            { status: 400 }
          );
        }
      } catch (promoError) {
        console.error("❌ Promo validation error:", promoError);
        return NextResponse.json(
          { error: "Failed to validate promo code" },
          { status: 500 }
        );
      }
    }

    // Calculate complete pricing breakdown including platform fees and payment gateway fees
    const pricingBreakdown = calculatePricing({
      tripPrice,
      days: ds,
      promoDiscount: validatedPromo?.discountAmount,
    });

    const finalPrice = pricingBreakdown.finalPrice;

    // Get charter's booking flow type
    const charterService = await import("@/lib/services/charter-service");
    const bookingFlowType = await charterService.getCharterFlowType(
      trip.charter.id
    );
    const isManualFlow = bookingFlowType === "MANUAL";

    let paymentFlow: "TOKENIZED" | "DIRECT" | "MOCK" | null = null;
    let paymentResult: any = null;
    let normalizedPaymentMethod: string | null = null;
    let initialStatus:
      | "PENDING"
      | "PAYMENT_AUTHORIZED"
      | "PAID"
      | "AWAITING_PAYMENT" = "PAYMENT_AUTHORIZED";
    let approvalDeadline: Date | null = null;
    let expiresAt: Date;

    if (isManualFlow) {
      const approvalHours = await charterService.getCharterApprovalTimeHours(
        trip.charter.id
      );
      const manualSlaHours = Number.isFinite(approvalHours)
        ? Number(approvalHours)
        : 24;
      approvalDeadline = new Date(Date.now() + manualSlaHours * 60 * 60 * 1000);
      expiresAt = approvalDeadline;
      initialStatus = "PENDING";
      console.log(
        `[BookingAPI] Manual flow booking → awaiting captain approval within ${manualSlaHours}h before payment.`,
        {
          charterId: trip.charter.id,
          userId: dbUserId,
        }
      );
    } else {
      // --- PAYMENT METHOD VALIDATION (AUTO FLOW) ---
      const validMethods = ["CARD", "FPX", "EWALLET", "MOCK"];
      if (!paymentMethod || !validMethods.includes(paymentMethod)) {
        return NextResponse.json(
          { error: "Valid payment method required (CARD, FPX, or EWALLET)" },
          { status: 400 }
        );
      }

      normalizedPaymentMethod = paymentMethod;

      if (
        normalizedPaymentMethod === "MOCK" &&
        process.env.SENANGPAY_FORCE_MOCK !== "true"
      ) {
        return NextResponse.json(
          {
            error:
              "Mock payments disabled. Set SENANGPAY_FORCE_MOCK=true to enable.",
          },
          { status: 400 }
        );
      }

      // DIRECT PAYMENT (FPX/E-WALLET): Create payment session instead of booking
      // Booking will be created after payment callback confirms success
      if (
        normalizedPaymentMethod === "FPX" ||
        normalizedPaymentMethod === "EWALLET"
      ) {
        const user = await prisma.user.findUnique({ where: { id: dbUserId } });
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        // Create payment session with booking data
        const paymentSession = await prisma.paymentSession.create({
          data: {
            userId: dbUserId,
            amount: finalPrice,
            paymentMethod: normalizedPaymentMethod,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
            bookingData: {
              tripId: trip.id,
              charterId: trip.charter.id,
              date: d.toISOString(),
              days: ds,
              startTime: trip.startTimes.length > 0 ? startTime : null,
              adults: ad,
              children: ch,
              phone,
              emergencyName,
              emergencyPhone,
              emergencyRelation,
              participants,
              note,
              pricingBreakdown: JSON.parse(JSON.stringify(pricingBreakdown)),
              promoCodeId: validatedPromo?.promoCodeId || null,
              promoCode: validatedPromo ? promoCode : null,
              promoDiscount: validatedPromo?.discountAmount || null,
            } as any,
          },
        });

        // Generate payment URL
        const directPaymentResult = await createPaymentIntent({
          bookingId: paymentSession.id, // Use session ID as order_id
          amount: finalPrice,
          paymentMethod: normalizedPaymentMethod as "FPX" | "EWALLET",
          description: `Booking for ${trip.name} on ${d.toISOString().split("T")[0]}`,
          customerName: user.name || "Guest",
          customerEmail: user.email,
          customerPhone: user.phone || phone || "",
        });

        if (!directPaymentResult.success || !directPaymentResult.redirectUrl) {
          console.error(
            "❌ Failed to generate payment URL:",
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

      if (normalizedPaymentMethod === "CARD") {
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
        normalizedPaymentMethod as "CARD" | "FPX" | "EWALLET" | "MOCK"
      );
      expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hour hold

      if (normalizedPaymentMethod === "MOCK") {
        paymentResult = {
          success: true,
          flow: "MOCK",
          paymentIntentId: `mock-${Date.now()}`,
          requiresRedirect: false,
        };
        initialStatus = "PAYMENT_AUTHORIZED";
      } else if (paymentFlow === "TOKENIZED") {
        try {
          const user = await prisma.user.findUnique({
            where: { id: dbUserId },
          });
          if (!user) {
            return NextResponse.json(
              { error: "User not found" },
              { status: 404 }
            );
          }

          paymentResult = await createPaymentIntent({
            bookingId: `temp-${Date.now()}`,
            amount: finalPrice,
            paymentMethod: "CARD",
            description: `Booking for ${trip.name} on ${date}`,
            cardDetails: {
              number: cardNumber!.replace(/\s/g, ""),
              cvv: cardCvv!,
              expiryMonth: cardExpMonth!,
              expiryYear: cardExpYear!,
            },
            customerName: user.name || "Guest",
            customerEmail: user.email,
            customerPhone: user.phone || phone || "",
          });

          if (!paymentResult.success) {
            console.error("❌ Card tokenization failed:", paymentResult.error);
            return NextResponse.json(
              {
                error:
                  paymentResult.error ||
                  "Failed to process card. Please check your card details and try again.",
              },
              { status: 400 }
            );
          }

          initialStatus = "PAYMENT_AUTHORIZED";
        } catch (error: any) {
          console.error("❌ Payment gateway error:", error);
          return NextResponse.json(
            { error: "Payment gateway error. Please try again." },
            { status: 500 }
          );
        }
      } else if (paymentFlow === "DIRECT") {
        // DIRECT flow: User redirected to payment gateway, status updated via callback
        initialStatus = "PAYMENT_AUTHORIZED";
      }
    }

    // --- AVAILABILITY: Check for blocked dates (schedule/unavailability) ---
    // Fetch charter schedule and unavailability from captain DB (or API)
    let charterSchedule = null;
    let charterUnavailability = null;
    try {
      // Try to get full charter details (schedule, unavailability)
      // Use charterId from trip.charter.id
      const charter = await charterService.getCharterById(trip.charter.id);
      charterSchedule = charter?.schedule ?? null;
      charterUnavailability = charter?.unavailability ?? null;
    } catch (e) {
      console.error(
        "[BookingAPI] Failed to fetch charter schedule/unavailability",
        e
      );
    }

    // Calculate blocked dates for the requested range
    // IMPORTANT: Check both schedule AND unavailability, even if schedule is null
    if (charterSchedule || charterUnavailability) {
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
        null, // Booked dates handled by conflict logic below
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

    // Availability guard: prevent overlapping bookings for the same charter
    // Only PAID bookings block dates (confirmed and paid bookings) for AUTO flow.
    // Manual flow blocks pending bookings to avoid duplicate requests in review window.
    const blockingStatuses = isManualFlow
      ? ([
          "PENDING",
          "AWAITING_PAYMENT",
          "PAYMENT_AUTHORIZED",
          "PAID",
          "COMPLETED",
        ] as const)
      : (["PAID"] as const);

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
        // Calculate timeSlots for new booking
        const newTimeSlots = calculateTimeSlots({
          date: d,
          startTime:
            trip.startTimes.length > 0 ? (startTime as string) : "08:00",
          durationHours: trip.durationHours,
          days: ds,
        });

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

            const conflicts = hasConflicts(candidates, newStart, ds, {
              usesStartTimes: trip.startTimes.length > 0,
              selectedStartTime:
                trip.startTimes.length > 0 ? (startTime as string) : null,
              newTimeSlots: newTimeSlots,
            });

            if (conflicts) {
              throw new Error("BOOKING_CONFLICT");
            }

            // Create booking atomically with payment tracking
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
                userId: dbUserId,
                tripId: trip.id,
                charterId: trip.charter.id,
                date: d,
                days: ds,
                startTime:
                  trip.startTimes.length > 0 ? (startTime as string) : null,
                timeSlots: newTimeSlots as unknown as Prisma.JsonArray,
                guests: guestsData as Prisma.JsonObject,
                tripPrice: pricingBreakdown.tripPrice, // Base price per day, not subtotal
                finalPrice: pricingBreakdown.finalPrice,
                platformFee: pricingBreakdown.platformFee,
                serviceFee: pricingBreakdown.serviceFee,
                captainEarnings: pricingBreakdown.captainEarnings,
                promoCodeId: validatedPromo?.promoCodeId || null,
                discount: validatedPromo
                  ? {
                      code: promoCode,
                      percentage: validatedPromo.percentage
                        ? `${validatedPromo.percentage}%`
                        : null,
                      amount: validatedPromo.discountAmount,
                    }
                  : Prisma.JsonNull,
                expiresAt,
                status: initialStatus,
                bookingFlowType: bookingFlowType,
                approvalDeadline: approvalDeadline,
                acknowledgmentDeadline: !isManualFlow ? expiresAt : null, // Only AUTO flow uses acknowledgment deadline
                // Payment tracking fields
                paymentMethod: normalizedPaymentMethod,
                paymentFlow: paymentFlow,
                paymentIntentId: !isManualFlow
                  ? paymentResult?.paymentIntentId || null
                  : null,
                paymentAuthorizedAt:
                  !isManualFlow &&
                  paymentFlow === "TOKENIZED" &&
                  paymentResult?.success
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
      console.error("❌ Booking creation failed after retries:", lastError);
      return NextResponse.json(
        { error: "Failed to create booking. Please try again." },
        { status: 500 }
      );
    }

    // Mark promo code as used (non-blocking best-effort)
    if (validatedPromo) {
      (async () => {
        try {
          await markPromoCodeUsed(
            dbUserId,
            validatedPromo.promoCodeId,
            booking.id
          );
          console.log("✅ Promo code marked as used:", {
            userId: dbUserId,
            promoCodeId: validatedPromo.promoCodeId,
            bookingId: booking.id,
          });
        } catch (promoError) {
          console.error("❌ Failed to mark promo code as used:", promoError);
          // Non-critical - booking is already created
        }
      })();
    }

    // Auto-create conversation for booking (Phase 2.1) (non-blocking best-effort)
    (async () => {
      try {
        // Only create conversation if captain exists
        if (!trip.charter.captain) {
          console.warn("⚠️ Skipping conversation creation - captain not found");
          return;
        }

        console.log("💬 Creating conversation for booking:", booking.id);
        const conversation = await createConversation(
          booking.id,
          dbUserId, // anglerId
          trip.charter.id, // charterId
          trip.charter.captain.id // ownerId
        );

        // Unlock conversation only for TOKENIZED flow (card pre-authorized)
        // DIRECT flow (FPX/E-wallet) stays locked until callback confirms payment
        if (
          booking.status === "PAYMENT_AUTHORIZED" &&
          paymentFlow === "TOKENIZED"
        ) {
          console.log(
            "🔓 Unlocking conversation for TOKENIZED payment (card pre-authorized)"
          );
          await unlockConversation(conversation.id);

          // Send system message informing about payment authorization
          const { paymentReceivedMessage } = await import(
            "@/lib/services/message-templates"
          );
          const { sendSystemMessage } = await import(
            "@/lib/services/message-service"
          );
          const template = paymentReceivedMessage();
          await sendSystemMessage(
            conversation.id,
            template.systemType,
            template.content,
            {
              bookingId: booking.id,
              status: "PAYMENT_AUTHORIZED",
            }
          );
          console.log("✅ Sent payment authorization system message");
        } else if (paymentFlow === "DIRECT") {
          console.log(
            "🔒 Conversation stays locked for DIRECT payment until callback confirms"
          );
        }

        // Send initial booking card message
        const bookingCardData = {
          bookingId: booking.id,
          charterName: trip.charter.name,
          tripName: trip.name,
          tripDate: booking.date.toISOString().slice(0, 10),
          tripDays: booking.days,
          adults: ad,
          children: ch,
          startTime: booking.startTime ?? undefined,
          totalPrice: `RM ${Number(booking.finalPrice).toFixed(2)}`,
          meetingPoint: trip.charter.startingPoint ?? undefined,
        };

        const templateMessage = bookingCreatedMessage(bookingCardData);

        await sendMessage(
          conversation.id,
          "system", // senderId
          templateMessage.content, // content
          "system", // senderType
          {
            contentType: "booking_card",
            systemType: templateMessage.systemType,
            bookingSnapshot: bookingCardData,
          }
        );

        console.log(
          "✅ Conversation and initial message created:",
          conversation.id
        );
      } catch (err) {
        console.error("❌ Failed to create conversation:", err);
        // Non-critical error - booking is created, just missing chat
      }
    })();

    // Outbound webhook to captain app (non-blocking)
    try {
      const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
      const hookSecret = process.env.CAPTAIN_API_SECRET;
      if (hookUrl && hookSecret) {
        const user = await prisma.user.findUnique({ where: { id: dbUserId } });
        const guests = booking.guests as { adults: number; children: number };
        const payload = {
          type: "booking.created",
          booking: {
            id: booking.id,
            tripId: booking.tripId,
            charterId: booking.charterId,
            anglerName: user?.name || "Guest",
            charterName: trip.charter.name,
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
        // Send webhook and wait for it to complete
        await sendWithRetry(hookUrl, payload, {
          headers: { "x-captain-secret": hookSecret },
          attempts: 3,
          baseDelayMs: 300,
        });
        console.log("✅ Webhook sent successfully to captain");
      }
    } catch (webhookErr) {
      console.error("⚠️ Webhook send failed:", webhookErr);
      // Non-critical - continue
    }

    // Notify angler (non-blocking best-effort)
    (async () => {
      try {
        console.log("🔔 Creating notification for user:", dbUserId);
        const notification = await createNotification({
          userId: dbUserId,
          type: "BOOKING_CREATED",
          title: "Booking Request Submitted! 🎣",
          message: `Your booking request for ${trip.charter.name} has been sent to the captain. You'll be notified once they review it.`,
          actionUrl: `/my/book/confirm?id=${booking.id}`,
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
        const confirmationUrl = `${base}/my/book/confirm?id=${encodeURIComponent(
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
          paymentFlow: booking.paymentFlow as
            | "TOKENIZED"
            | "DIRECT"
            | undefined,
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

    // SMS the captain (non-blocking best-effort)
    (async () => {
      try {
        const captain = trip.charter.captain;
        if (!captain?.phone) {
          console.warn("Captain phone not available for booking:", booking.id);
          return;
        }

        const user = await prisma.user.findUnique({ where: { id: dbUserId } });
        const anglerName = user?.name ?? "Guest";

        await sendCaptainBookingReceivedSMS({
          phone: captain.phone,
          charterName: trip.charter.name,
          anglerName: anglerName,
          tripDate: booking.date.toISOString().slice(0, 10),
          bookingId: booking.id,
        });
      } catch (err) {
        console.error("Failed to send captain booking SMS:", err);
      }
    })();

    // Track booking submission (non-blocking)
    (async () => {
      try {
        const charter = await charterService.getCharterById(trip.charter.id);

        await trackEvent({
          eventType: "BOOKING_SUBMITTED",
          charterId: trip.charter.id,
          ownerId: charter?.ownerId,
          userId: dbUserId,
          metadata: {
            tripId: trip.id,
            tripName: trip.name,
            date: booking.date.toISOString().slice(0, 10),
            days: booking.days,
            adults: ad,
            children: ch,
            finalPrice: Number(booking.finalPrice),
          },
        });
      } catch (err) {
        // Silent fail - analytics shouldn't block booking
        console.error("Failed to track booking submitted:", err);
      }
    })();

    //TODO: check if revalidation really needed
    // Revalidate relevant pages after booking creation
    try {
      // Wait briefly for conversation creation (async IIFE above)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Fetch conversation ID for this booking
      const conversation = await prisma.conversation.findUnique({
        where: { bookingId: booking.id },
        select: { id: true },
      });

      // Revalidate booking list and confirmation page for all locales
      const locales = ["my", "en"];
      for (const locale of locales) {
        revalidatePath(`/${locale}/account/bookings`, "page");
        revalidatePath(`/${locale}/book/confirm`, "page");
      }

      // Revalidate message page if conversation exists
      if (conversation) {
        for (const locale of locales) {
          revalidatePath(
            `/${locale}/account/messages/${conversation.id}`,
            "page"
          );
        }
        console.log(
          "✅ Revalidated pages including message page:",
          conversation.id
        );
      } else {
        console.log("✅ Revalidated pages (no conversation yet)");
      }
    } catch (revalidateErr) {
      console.warn(
        "⚠️ Failed to revalidate paths after booking creation:",
        revalidateErr
      );
      // Non-critical error - continue with response
    }

    // TOKENIZED, MOCK, or MANUAL flow - return booking directly
    return NextResponse.json({ booking }, { status: 201 });
  } catch (e: any) {
    console.error("authenticated booking.create error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
