import { trackEvent } from "@/lib/analytics-service";
import { auth } from "@/lib/auth/auth";
import { calculateTimeSlots } from "@/lib/booking/booking-time";
import { hasConflicts } from "@/lib/booking/overlap";
import { prisma } from "@/lib/database/prisma";
import {
  getCharterApprovalTimeHours,
  getCharterById,
  getCharterFlowType,
} from "@/lib/services/charter-service";
import {
  sendBookingCreatedEmail,
  sendBookingReceivedCaptainEmail,
} from "@/lib/services/email-service";
import {
  createConversation,
  sendMessage,
} from "@/lib/services/message-service";
import { createNotification } from "@/lib/services/notification-service";
import { calculatePricing } from "@/lib/services/pricing-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * POST /api/bookings/create-manual
 *
 * Create a booking with PENDING status for Manual flow (request → approve → pay)
 * This endpoint does NOT process payment - payment happens after captain approval
 */
export async function POST(req: Request) {
  try {
    const session = await auth();

    // Only authenticated users can create manual bookings
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return await createManualBooking(session, await req.json());
  } catch (e: any) {
    console.error("booking.create-manual error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function createManualBooking(session: any, body: any) {
  try {
    const userId = session.user.id!;
    const {
      charterId, // Charter ID to verify flow type
      tripId,
      date,
      days,
      adults,
      children,
      startTime,
      note,
      phone,
      emergencyName,
      emergencyPhone,
      emergencyRelation,
      participants,
    } = body as {
      charterId?: string;
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
    };

    // Basic validation
    if (!charterId || typeof charterId !== "string") {
      return NextResponse.json(
        { error: "charterId required" },
        { status: 400 }
      );
    }

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
    today.setHours(0, 0, 0, 0);
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

    // Verify charter exists and is Manual flow
    const charter = await getCharterById(charterId);
    if (!charter) {
      return NextResponse.json({ error: "Charter not found" }, { status: 404 });
    }

    const flowType = await getCharterFlowType(charterId);
    if (flowType !== "MANUAL") {
      return NextResponse.json(
        {
          error: "This charter requires instant booking payment",
          charterFlowType: flowType,
        },
        { status: 400 }
      );
    }

    // Ensure local user exists
    let dbUserId = userId;
    try {
      const canUserQuery =
        typeof (prisma as any)?.user?.findUnique === "function";
      if (canUserQuery) {
        let dbUser = await (prisma as any).user.findUnique({
          where: { id: userId },
        });
        if (!dbUser) {
          console.warn(`User ${userId} from session not in DB, creating...`);
          dbUser = await (prisma as any).user.create({
            data: {
              id: userId,
              email: session.user.email!,
              name: session.user.name,
            },
          });
        }
        dbUserId = dbUser.id;

        // Update user phone if provided
        if (phone && typeof phone === "string") {
          await (prisma as any).user.update({
            where: { id: dbUserId },
            data: { phone },
          });
        }
      }
    } catch (userErr) {
      console.error("Error checking/creating user:", userErr);
    }

    // Fetch trip details
    const trip = await getTripById(tripId);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Calculate pricing
    const pricing = calculatePricing({
      tripPrice: trip.price,
      days: ds,
    });

    // Calculate time slots for conflict detection
    const slots = calculateTimeSlots({
      date: d,
      startTime: startTime || "08:00",
      durationHours: trip.durationHours,
      days: ds,
    });

    // Check for conflicts in confirmed bookings
    const existingBookings = await prisma.booking.findMany({
      where: {
        charterId: trip.charter.id,
        tripId,
        status: {
          in: [
            "PENDING",
            "AWAITING_PAYMENT",
            "PAYMENT_AUTHORIZED",
            "PAID",
            "COMPLETED",
          ],
        },
      },
      select: {
        id: true,
        date: true,
        days: true,
        startTime: true,
        status: true,
      },
    });

    const hasConflict = hasConflicts(
      existingBookings.map((b) => ({
        id: b.id,
        date: b.date,
        days: b.days,
        startTime: b.startTime,
        timeSlots: null,
      })),
      d,
      ds,
      {
        usesStartTimes: true,
        selectedStartTime: startTime,
        newTimeSlots: slots,
      }
    );

    if (hasConflict) {
      return NextResponse.json(
        {
          error: "Selected date/time is already booked",
          conflictingDates: [d.toISOString().split("T")[0]],
        },
        { status: 409 }
      );
    }

    // Get approval deadline (charter-specific or default 24h)
    const approvalTimeHours = await getCharterApprovalTimeHours(charterId);
    const approvalDeadline = new Date(
      Date.now() + approvalTimeHours * 60 * 60 * 1000
    );

    // Create booking with PENDING status
    const booking = await prisma.booking.create({
      data: {
        userId: dbUserId,
        charterId: trip.charter.id,
        tripId,
        date: d,
        days: ds,
        startTime: startTime || trip.startTimes[0] || "08:00",
        guests: {
          adults: ad,
          children: ch,
          participants: participants || [],
        } as Prisma.JsonObject,
        tripPrice: pricing.tripPrice,
        finalPrice: pricing.finalPrice,
        platformFee: pricing.platformFee,
        captainEarnings: pricing.captainEarnings,

        // Manual flow specific
        status: "PENDING",
        bookingFlowType: "MANUAL",
        approvalDeadline,
        expiresAt: approvalDeadline, // Will expire if captain doesn't respond

        // Note: Emergency contact stored in guests JSON or separate table

        // No payment fields for Manual flow
        paymentMethod: null,
        paymentFlow: null,
        paymentIntentId: null,
        paymentAuthorizedAt: null,

        note: note || undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Create conversation between angler and captain
    // Note: Conversation is locked until payment for Manual flow
    let conversationId: string | null = null;
    try {
      const conversation = await createConversation(
        booking.id,
        dbUserId,
        String(charter.id),
        String(trip.charter.captain?.id || charter.ownerId)
      );
      conversationId = conversation.id;

      // Send initial system message
      if (conversationId) {
        const messageContent = `New booking request for ${charter.name} - ${trip.name}. Date: ${d.toISOString().split("T")[0]}, ${ds} day(s), ${ad + ch} guests. Total: RM${pricing.finalPrice.toFixed(2)}`;
        await sendMessage(conversationId, "system", messageContent, "system");
      }
    } catch (convErr) {
      console.error("Failed to create conversation:", convErr);
    }

    // Send notification to captain
    try {
      await createNotification({
        userId: String(trip.charter.captain?.id || charter.ownerId),
        type: "BOOKING_CREATED",
        title: "New Booking Request",
        message: `${session.user.name || session.user.email} has requested a booking for ${charter.name}`,
        actionUrl: `/captain/bookings/${booking.id}`,
        actionLabel: "Review Booking",
        bookingId: booking.id,
        charterId: String(charter.id),
        metadata: {
          anglerName: session.user.name,
          anglerEmail: session.user.email,
          tripDate: d.toISOString().split("T")[0],
          approvalDeadline: approvalDeadline.toISOString(),
        },
      });
    } catch (notifErr) {
      console.error("Failed to create notification:", notifErr);
    }

    // Send emails
    try {
      // Email to angler
      await sendBookingCreatedEmail({
        to: session.user.email!,
        userName: session.user.name || session.user.email!,
        charterName: charter.name,
        tripName: trip.name,
        tripDate: d.toISOString().split("T")[0],
        tripDays: ds,
        durationHours: trip.durationHours,
        startTime: booking.startTime || undefined,
        totalPrice: pricing.finalPrice.toFixed(2),
        confirmationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/my/account/bookings/${booking.id}`,
      });

      // Email to captain
      await sendBookingReceivedCaptainEmail({
        to: trip.charter.captain?.email || "",
        captainName: trip.charter.captain?.displayName || "Captain",
        charterName: charter.name,
        anglerName: session.user.name || session.user.email!,
        tripName: trip.name,
        tripDate: d.toISOString().split("T")[0],
        tripDays: ds,
        durationHours: trip.durationHours,
        startTime: booking.startTime || undefined,
        totalPrice: pricing.finalPrice.toFixed(2),
        bookingUrl: `${process.env.NEXT_PUBLIC_CAPTAIN_DASHBOARD_URL}/bookings/${booking.id}`,
      });
    } catch (emailErr) {
      console.error("Failed to send emails:", emailErr);
    }

    // Send webhook to captain dashboard
    try {
      const webhookUrl =
        process.env.FISHON_CAPTAIN_WEBHOOK_URL ||
        process.env.NEXT_PUBLIC_CAPTAIN_DASHBOARD_URL + "/api/webhooks/booking";

      await sendWithRetry(webhookUrl, {
        event: "booking.request_received",
        bookingId: booking.id,
        charterId: trip.charter.id,
        status: "PENDING",
        date: d.toISOString(),
        days: ds,
        finalPrice: pricing.finalPrice,
        approvalDeadline: approvalDeadline.toISOString(),
        anglerEmail: booking.user.email,
        anglerName: booking.user.name,
      });
    } catch (webhookErr) {
      console.error("Failed to send webhook:", webhookErr);
    }

    // Track analytics
    try {
      await trackEvent({
        eventType: "CHARTER_VIEW",
        userId: dbUserId,
        sessionId: undefined,
        metadata: {
          bookingId: booking.id,
          charterId: trip.charter.id,
          tripId,
          bookingFlowType: "MANUAL",
          status: "PENDING",
          finalPrice: pricing.finalPrice,
          days: ds,
          adults: ad,
          children: ch,
        },
      });
    } catch (analyticsErr) {
      console.error("Failed to track analytics:", analyticsErr);
    }

    // Revalidate relevant pages after booking creation
    try {
      // Revalidate booking list and confirmation page
      revalidatePath("/account/bookings");
      revalidatePath("/book/confirm");

      // Revalidate message page if conversation exists
      if (conversationId) {
        revalidatePath(`/account/messages/${conversationId}`);
      }
    } catch (revalidateErr) {
      console.warn(
        "⚠️ Failed to revalidate paths after manual booking creation:",
        revalidateErr
      );
      // Non-critical error - continue with response
    }

    // Return booking ID and conversation
    return NextResponse.json(
      {
        success: true,
        booking: {
          id: booking.id,
          status: "PENDING",
          approvalDeadline: approvalDeadline.toISOString(),
          conversationId,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating manual booking:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create booking" },
      { status: 500 }
    );
  }
}
