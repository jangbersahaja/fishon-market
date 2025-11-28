import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import {
  capturePayment,
  createPaymentIntent,
  type PaymentMethod,
} from "@/lib/payment/payment-gateway";
import {
  sendBookingConfirmedAnglerEmail,
  sendBookingConfirmedCaptainEmail,
} from "@/lib/services/email-service";
import {
  sendMessage,
  unlockConversation,
} from "@/lib/services/message-service";
import { paymentConfirmedMessage } from "@/lib/services/message-templates";
import { createNotification } from "@/lib/services/notification-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { NextResponse } from "next/server";

// Manual flow payment endpoint - processes payment through SenangPay gateway
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, paymentMethod, cardNumber, cardExpMonth, cardExpYear, cardCvv } =
    body as {
      id?: string;
      paymentMethod?: string;
      cardNumber?: string;
      cardExpMonth?: string;
      cardExpYear?: string;
      cardCvv?: string;
    };

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (!paymentMethod) {
    return NextResponse.json(
      { error: "paymentMethod required" },
      { status: 400 }
    );
  }

  // Fetch the booking with user details
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Verify ownership
  if (booking.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Verify status
  if (booking.status !== "AWAITING_PAYMENT") {
    return NextResponse.json(
      { error: "Booking is not awaiting payment" },
      { status: 409 }
    );
  }

  // Normalize payment method
  const normalizedPaymentMethod = (paymentMethod || "").toUpperCase();

  // Handle MOCK payment (development only)
  if (normalizedPaymentMethod === "MOCK") {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "Mock payment not available in production" },
        { status: 403 }
      );
    }

    // Mock payment - directly mark as PAID
    await prisma.booking.update({
      where: { id },
      data: {
        status: "PAID",
        paymentMethod: "MOCK",
        paymentIntentId: `mock-${Date.now()}`,
        paymentTransactionId: `mock-txn-${Date.now()}`,
        paidAt: new Date(),
      },
    });

    const updated = await prisma.booking.findUnique({ where: { id } });

    // Trigger side effects (notifications, emails, webhooks)
    await triggerPaymentSideEffects(updated!, session.user.id);

    return NextResponse.json({ ok: true });
  }

  // Process real payment through SenangPay
  try {
    const user = booking.user;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch trip details for description
    const trip = await getTripById(booking.tripId);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const description = `${trip.name} - ${booking.date.toISOString().slice(0, 10)}`;
    const amount = Number(booking.finalPrice);

    // Validate card details for CARD payment
    if (normalizedPaymentMethod === "CARD") {
      if (!cardNumber || !cardExpMonth || !cardExpYear || !cardCvv) {
        return NextResponse.json(
          { error: "Card details required for card payment" },
          { status: 400 }
        );
      }

      // Step 1: Tokenize the card
      console.log("💳 [MANUAL PAY] Tokenizing card for booking:", id);
      const paymentResult = await createPaymentIntent({
        bookingId: booking.id,
        amount,
        paymentMethod: "CARD",
        description,
        cardDetails: {
          number: cardNumber.replace(/\s/g, ""),
          cvv: cardCvv,
          expiryMonth: cardExpMonth,
          expiryYear: cardExpYear,
        },
        customerName: user.name || "Guest",
        customerEmail: user.email,
        customerPhone: user.phone || "",
      });

      if (!paymentResult.success) {
        console.error("❌ Card tokenization failed:", paymentResult.error);
        return NextResponse.json(
          {
            error:
              paymentResult.error ||
              "Failed to process card. Please check your card details.",
          },
          { status: 400 }
        );
      }

      console.log("✅ [MANUAL PAY] Card tokenized, now capturing payment");

      // Step 2: Immediately capture the payment (captain already approved in MANUAL flow)
      const captureResult = await capturePayment(
        paymentResult.paymentIntentId!,
        amount,
        booking.id
      );

      if (!captureResult.success) {
        console.error("❌ Card capture failed:", captureResult.error);
        return NextResponse.json(
          {
            error:
              captureResult.error ||
              "Payment was declined. Please try a different card or payment method.",
          },
          { status: 400 }
        );
      }

      console.log("✅ [MANUAL PAY] Payment captured successfully:", {
        bookingId: id,
        transactionId: captureResult.transactionId,
      });

      // Calculate financial breakdown
      const { prismaCaptain } = await import("@/lib/database/prisma-captain");
      const charter = await (prismaCaptain as any).charter.findUnique({
        where: { id: booking.charterId },
        select: { pricingPlan: true },
      });

      const commissionRate =
        charter?.pricingPlan === "GOLD"
          ? 0.05
          : charter?.pricingPlan === "SILVER"
            ? 0.08
            : 0.1; // BASIC

      const platformFee = Math.round(amount * commissionRate * 100) / 100;
      const captainEarnings = amount - platformFee;

      // Card captured successfully - mark as PAID
      await prisma.booking.update({
        where: { id },
        data: {
          status: "PAID",
          paymentMethod: "CARD",
          paymentFlow: "TOKENIZED",
          paymentIntentId: paymentResult.paymentIntentId,
          paymentTransactionId: captureResult.transactionId,
          paidAt: new Date(),
          platformFee,
          captainEarnings,
          payoutStatus: "PENDING",
        },
      });

      const updated = await prisma.booking.findUnique({ where: { id } });

      // Trigger side effects (notifications, emails, webhooks)
      await triggerPaymentSideEffects(updated!, session.user.id);

      return NextResponse.json({
        ok: true,
        requiresRedirect: false,
      });
    }

    // Process FPX/E-wallet payment (requires redirect)
    if (
      normalizedPaymentMethod === "FPX" ||
      normalizedPaymentMethod === "EWALLET"
    ) {
      const paymentResult = await createPaymentIntent({
        bookingId: booking.id,
        amount,
        paymentMethod: normalizedPaymentMethod as PaymentMethod,
        description,
        customerName: user.name || "Guest",
        customerEmail: user.email,
        customerPhone: user.phone || "",
      });

      if (!paymentResult.success || !paymentResult.redirectUrl) {
        console.error(
          "❌ Failed to generate payment URL:",
          paymentResult.error
        );
        return NextResponse.json(
          {
            error: paymentResult.error || "Failed to generate payment URL",
          },
          { status: 500 }
        );
      }

      // Return redirect URL to client
      return NextResponse.json({
        ok: true,
        requiresRedirect: true,
        redirectUrl: paymentResult.redirectUrl,
      });
    }

    return NextResponse.json(
      { error: "Invalid payment method" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("❌ Payment processing error:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}

// Helper function to trigger payment side effects (notifications, emails, webhooks)
async function triggerPaymentSideEffects(
  booking: any,
  userId: string
): Promise<void> {
  // CRITICAL: Unlock conversation for payment (Phase 2.2) (non-blocking best-effort)
  // This transitions conversation from LOCKED -> ACTIVE, enabling full chat
  (async () => {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { bookingId: booking.id },
      });

      if (conversation) {
        // Unlock the conversation (LOCKED -> ACTIVE)
        await unlockConversation(conversation.id);

        // Send payment confirmed system message
        const trip = await getTripById(booking.tripId);
        const bookingCardData = {
          bookingId: booking.id,
          charterName: trip?.charter.name || "",
          tripName: trip?.name || "",
          tripDate: booking.date.toISOString().slice(0, 10),
          tripDays: booking.days,
          adults: 0,
          children: 0,
          totalPrice: `RM ${Number(booking.finalPrice).toFixed(2)}`,
          meetingPoint: trip?.charter.startingPoint ?? undefined,
        };

        const templateMessage = paymentConfirmedMessage(bookingCardData);

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
          "✅ Conversation unlocked and payment message sent:",
          conversation.id
        );
      }
    } catch (err) {
      console.error("❌ Failed to unlock conversation:", err);
      // Non-critical - booking is still paid, chat will be accessible next reload
    }
  })();

  // Notify angler (non-blocking best-effort)
  (async () => {
    try {
      const trip = await getTripById(booking.tripId);
      if (!trip) return;

      await createNotification({
        userId: userId,
        type: "BOOKING_PAID",
        title: "Payment Confirmed! ✅",
        message: `Your payment for ${trip.charter.name} on ${booking.date.toISOString().slice(0, 10)} has been confirmed. Get ready for an amazing trip!`,
        actionUrl: `/my/book/confirm?id=${booking.id}`,
        actionLabel: "View Booking Details",
        bookingId: booking.id,
        charterId: trip.charter.id,
        metadata: {
          charterName: trip.charter.name,
          tripDate: booking.date.toISOString().slice(0, 10),
        },
      });
    } catch (err) {
      console.error("Failed to create payment notification:", err);
    }
  })();

  // Email angler confirmation (non-blocking best-effort)
  (async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: booking.userId },
      });
      if (!user?.email) return;

      // Fetch trip data to get all details
      const trip = await getTripById(booking.tripId);
      if (!trip) return;

      const captain = trip.charter.captain;
      if (!captain) return;

      const base =
        process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
      const bookingUrl = `${base}/my/book/confirm?id=${encodeURIComponent(
        booking.id
      )}`;

      await sendBookingConfirmedAnglerEmail({
        to: user.email,
        userName: user.name ?? "there",
        charterName: trip.charter.name,
        captainName: captain.displayName,
        captainEmail: captain.email,
        captainPhone: captain.phone || "",
        tripName: trip.name,
        tripDate: booking.date.toISOString().slice(0, 10),
        tripDays: booking.days,
        durationHours: trip.durationHours,
        startTime: booking.startTime ?? undefined,
        finalPrice: `RM ${Number(booking.finalPrice).toFixed(2)}`,
        bookingUrl,
      });
    } catch (err) {
      console.error("Failed to send angler payment confirmation email:", err);
    }
  })();

  // Email captain confirmation (non-blocking best-effort)
  (async () => {
    try {
      // Fetch trip data to get captain info
      const trip = await getTripById(booking.tripId);
      if (!trip) return;

      const captain = trip.charter.captain;
      if (!captain?.email) {
        console.warn(
          "Captain email not available for payment confirmation:",
          booking.id
        );
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: booking.userId },
      });

      const captainBaseUrl =
        process.env.FISHON_CAPTAIN_API_URL || "http://localhost:3000";
      const bookingUrl = `${captainBaseUrl}/captain/bookings/${encodeURIComponent(
        booking.id
      )}`;

      await sendBookingConfirmedCaptainEmail({
        to: captain.email,
        captainName: captain.displayName,
        charterName: trip.charter.name,
        anglerName: user?.name ?? "Angler",
        anglerEmail: user?.email ?? "",
        anglerPhone: user?.phone ?? "",
        tripName: trip.name,
        tripDate: booking.date.toISOString().slice(0, 10),
        tripDays: booking.days,
        durationHours: trip.durationHours,
        startTime: booking.startTime ?? undefined,
        finalPrice: `RM ${Number(booking.finalPrice).toFixed(2)}`,
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
    if (hookUrl && hookSecret) {
      const payload = {
        type: "booking.paid",
        booking: {
          id: booking.id,
          captainCharterId: booking.captainCharterId,
          charterName: booking.charterName,
          tripName: booking.tripName,
          date: booking.date.toISOString(),
          startTime: booking.startTime,
          days: booking.days,
          totalPrice: booking.totalPrice,
          status: booking.status,
        },
      };
      sendWithRetry(hookUrl, payload, {
        headers: { "x-captain-secret": hookSecret },
        attempts: 3,
        baseDelayMs: 300,
      });
    }
  } catch {}
}
