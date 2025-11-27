import { locales } from "@/i18n/config";
import { prisma } from "@/lib/database/prisma";
import { createNotification } from "@/lib/services/notification-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { revalidatePath } from "next/cache";

/**
 * Payment Side Effects Handler
 *
 * Centralized function for handling all side effects after payment confirmation.
 * This ensures consistency across all payment confirmation paths:
 * - Mock payment (development only)
 * - Senang Pay return URL handler
 * - Senang Pay callback webhook (authoritative)
 *
 * Side Effects:
 * 1. Notify captain via webhook (captain app receives booking.paid event)
 * 2. Notify angler via in-app notification
 * 3. Revalidate pages for fresh data
 *
 * All side effects run asynchronously and log errors without throwing.
 */

interface PaymentSideEffectsOptions {
  bookingId: string;
  source: "mock" | "return" | "callback";
}

export async function triggerPaymentSideEffects({
  bookingId,
  source,
}: PaymentSideEffectsOptions): Promise<void> {
  console.log(`✨ [PAYMENT SIDE EFFECTS] Starting (source: ${source})`, {
    bookingId,
    timestamp: new Date().toISOString(),
  });

  // Fetch booking with required data
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          name: true,
          firstName: true,
          lastName: true,
        },
      },
      tripId: true,
      charterId: true,
      date: true,
      status: true,
    },
  });

  if (!booking) {
    console.error(`❌ [PAYMENT SIDE EFFECTS] Booking not found: ${bookingId}`);
    return;
  }

  // Run side effects in parallel (non-blocking)
  await Promise.allSettled([
    notifyCaptain(booking, source),
    notifyAngler(booking, source),
    sendCaptainPaymentEmail(bookingId, source),
    sendCaptainPaymentSMS(bookingId, source),
    unlockConversation(bookingId, source),
    revalidatePages(bookingId),
  ]);

  console.log(`✅ [PAYMENT SIDE EFFECTS] Completed (source: ${source})`);
}

/**
 * Side Effect 1: Notify Captain via Webhook
 *
 * Sends booking.paid event to captain app webhook endpoint.
 * Captain app will show notification in dashboard and update booking status.
 */
async function notifyCaptain(
  booking: {
    id: string;
    userId: string;
    user: {
      name: string | null;
      firstName: string | null;
      lastName: string | null;
    };
    tripId: string;
    charterId: string;
    date: Date;
    status: string;
  },
  source: string
): Promise<void> {
  try {
    const hookUrl = process.env.CAPTAIN_WEBHOOK_URL;
    const hookSecret = process.env.CAPTAIN_API_SECRET;

    if (!hookUrl || !hookSecret) {
      console.warn(
        `⚠️ [PAYMENT SIDE EFFECTS] Skipping captain webhook - URL or secret not configured (source: ${source})`
      );
      return;
    }

    // Fetch trip data for webhook payload
    const trip = await getTripById(booking.tripId);

    const anglerName =
      booking.user.name ||
      (booking.user.firstName && booking.user.lastName
        ? `${booking.user.firstName} ${booking.user.lastName}`
        : "Angler");

    const payload = {
      type: "booking.paid",
      booking: {
        id: booking.id,
        tripId: booking.tripId,
        charterId: booking.charterId,
        status: booking.status,
        date: booking.date.toISOString(),
        anglerName,
        charterName: trip?.charter?.name || "Your charter",
      },
    };

    console.log(
      `📤 [PAYMENT SIDE EFFECTS] Sending captain webhook (source: ${source})`,
      {
        bookingId: booking.id,
        hookUrl,
      }
    );

    await sendWithRetry(hookUrl, payload, {
      headers: { "x-captain-secret": hookSecret },
      attempts: 3,
      baseDelayMs: 300,
    });

    console.log(
      `✅ [PAYMENT SIDE EFFECTS] Captain webhook sent successfully (source: ${source})`
    );
  } catch (error) {
    console.error(
      `❌ [PAYMENT SIDE EFFECTS] Failed to send captain webhook (source: ${source}):`,
      error
    );
  }
}

/**
 * Side Effect 2: Notify Angler
 *
 * Creates in-app notification for authenticated users.
 * Guest bookings don't get notifications (they receive email instead).
 */
async function notifyAngler(
  booking: {
    id: string;
    userId: string | null;
    tripId: string;
    charterId: string;
    date: Date;
  },
  source: string
): Promise<void> {
  try {
    // Skip notification for guest bookings
    if (!booking.userId) {
      console.log(
        `⏭️ [PAYMENT SIDE EFFECTS] Skipping angler notification - guest booking (source: ${source})`
      );
      return;
    }

    const trip = await getTripById(booking.tripId);
    if (!trip) {
      console.error(
        `❌ [PAYMENT SIDE EFFECTS] Trip not found for notification (source: ${source})`,
        {
          tripId: booking.tripId,
        }
      );
      return;
    }

    await createNotification({
      userId: booking.userId,
      type: "BOOKING_PAID",
      title: "Payment Confirmed! ✅",
      message: `Your payment for ${trip.charter.name} on ${booking.date.toISOString().slice(0, 10)} has been confirmed. See you on the water!`,
      actionUrl: `/my/book/confirm?id=${booking.id}`,
      actionLabel: "View Confirmation",
      bookingId: booking.id,
      charterId: booking.charterId,
      metadata: {
        charterName: trip.charter.name,
        tripDate: booking.date.toISOString().slice(0, 10),
      },
    });

    console.log(
      `✅ [PAYMENT SIDE EFFECTS] Angler notification created (source: ${source})`
    );
  } catch (error) {
    console.error(
      `❌ [PAYMENT SIDE EFFECTS] Failed to create angler notification (source: ${source}):`,
      error
    );
  }
}

/**
 * Side Effect 3: Send Captain Payment Confirmation Email
 *
 * Sends detailed payment confirmation email to captain with pricing breakdown.
 * Includes final price, platform fee, and captain earnings.
 */
async function sendCaptainPaymentEmail(
  bookingId: string,
  source: string
): Promise<void> {
  try {
    // Fetch complete booking data with related information
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        tripId: true,
        date: true,
        days: true,
        startTime: true,
        finalPrice: true,
        platformFee: true,
        captainEarnings: true,
        paymentFlow: true,
        user: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      console.error(
        `❌ [PAYMENT SIDE EFFECTS] Booking not found for email (source: ${source}):`,
        bookingId
      );
      return;
    }

    // Fetch trip and charter info
    const trip = await getTripById(booking.tripId);
    if (!trip || !trip.charter) {
      console.error(
        `❌ [PAYMENT SIDE EFFECTS] Trip or charter not found for email (source: ${source})`
      );
      return;
    }

    if (!trip.charter.captain?.email) {
      console.error(
        `❌ [PAYMENT SIDE EFFECTS] Captain email not found (source: ${source})`
      );
      return;
    }

    // Format angler name
    const anglerName =
      booking.user?.name ||
      (booking.user?.firstName && booking.user?.lastName
        ? `${booking.user.firstName} ${booking.user.lastName}`
        : "Angler");

    // Format captain name
    const captainName = trip.charter.captain.displayName || "Captain";

    // Calculate trip price (subtotal before platform fee)
    const finalPrice = Number(booking.finalPrice);
    const platformFee = Number(booking.platformFee || 0);
    const captainEarnings = Number(booking.captainEarnings || 0);
    const subtotal = captainEarnings + platformFee;

    // Format date
    const tripDate = new Date(booking.date).toLocaleDateString("en-MY", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Send email with pricing breakdown
    const { sendBookingConfirmedCaptainEmail } = await import(
      "@/lib/services/email-service"
    );

    await sendBookingConfirmedCaptainEmail({
      to: trip.charter.captain.email,
      captainName,
      charterName: trip.charter.name,
      tripName: trip.name,
      tripDate,
      tripDays: booking.days,
      durationHours: trip.durationHours,
      startTime: booking.startTime || undefined,
      finalPrice: `RM ${finalPrice.toFixed(2)}`,
      anglerName,
      anglerEmail: booking.user?.email || "",
      anglerPhone: booking.user?.phone || "",
      bookingUrl: `${process.env.NEXT_PUBLIC_CAPTAIN_APP_URL || "https://captain.fishon.my"}/captain/bookings/${bookingId}`,
      subtotal: `RM ${subtotal.toFixed(2)}`,
      platformFee: `RM ${platformFee.toFixed(2)}`,
      captainEarnings: `RM ${captainEarnings.toFixed(2)}`,
      paymentFlow:
        (booking.paymentFlow as "TOKENIZED" | "DIRECT") || "TOKENIZED",
    });

    console.log(
      `✅ [PAYMENT SIDE EFFECTS] Captain payment email sent successfully (source: ${source})`,
      {
        bookingId,
        captainEmail: trip.charter.captain.email,
        finalPrice: `RM ${finalPrice.toFixed(2)}`,
        captainEarnings: `RM ${captainEarnings.toFixed(2)}`,
      }
    );
  } catch (error) {
    console.error(
      `❌ [PAYMENT SIDE EFFECTS] Failed to send captain payment email (source: ${source}):`,
      error
    );
  }
}

/**
 * Side Effect 3b: Send Captain Payment SMS
 *
 * Sends SMS notification to captain when payment is confirmed.
 */
async function sendCaptainPaymentSMS(
  bookingId: string,
  source: string
): Promise<void> {
  try {
    // Fetch booking with user info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        tripId: true,
        date: true,
        captainEarnings: true,
        user: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!booking) {
      console.error(
        `❌ [PAYMENT SIDE EFFECTS] Booking not found for SMS (source: ${source}):`,
        bookingId
      );
      return;
    }

    // Fetch trip and charter info
    const trip = await getTripById(booking.tripId);
    if (!trip || !trip.charter) {
      console.error(
        `❌ [PAYMENT SIDE EFFECTS] Trip or charter not found for SMS (source: ${source})`
      );
      return;
    }

    // Check if captain has phone number
    if (!trip.charter.captain?.phone) {
      console.warn(
        `⚠️ [PAYMENT SIDE EFFECTS] Captain phone not found, skipping SMS (source: ${source})`
      );
      return;
    }

    // Format angler name
    const anglerName =
      booking.user?.name ||
      (booking.user?.firstName && booking.user?.lastName
        ? `${booking.user.firstName} ${booking.user.lastName}`
        : "Angler");

    // Format date
    const tripDate = new Date(booking.date).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const captainEarnings = Number(booking.captainEarnings || 0);

    // Send SMS
    const { sendCaptainBookingPaidSMS } = await import(
      "@/lib/services/sms-service"
    );

    await sendCaptainBookingPaidSMS({
      phone: trip.charter.captain.phone,
      charterName: trip.charter.name,
      anglerName,
      tripDate,
      captainEarnings: captainEarnings.toFixed(2),
      bookingId,
    });

    console.log(
      `✅ [PAYMENT SIDE EFFECTS] Captain payment SMS sent successfully (source: ${source})`,
      {
        bookingId,
        captainPhone: trip.charter.captain.phone,
        captainEarnings: `RM ${captainEarnings.toFixed(2)}`,
      }
    );
  } catch (error) {
    console.error(
      `❌ [PAYMENT SIDE EFFECTS] Failed to send captain payment SMS (source: ${source}):`,
      error
    );
  }
}

/**
 * Side Effect 4: Unlock Conversation
 *
 * Unlocks the conversation between angler and captain after payment is confirmed.
 * This enables the chat feature for both parties.
 */
async function unlockConversation(
  bookingId: string,
  source: string
): Promise<void> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { bookingId },
      select: { id: true, status: true },
    });

    if (!conversation) {
      console.warn(
        `⚠️ [PAYMENT SIDE EFFECTS] No conversation found for booking (source: ${source})`,
        { bookingId }
      );
      return;
    }

    if (conversation.status === "ACTIVE") {
      console.log(
        `⏭️ [PAYMENT SIDE EFFECTS] Conversation already active (source: ${source})`,
        { bookingId, conversationId: conversation.id }
      );
      return;
    }

    const { unlockConversation: unlock } = await import(
      "@/lib/services/message-service"
    );
    await unlock(conversation.id);

    console.log(
      `✅ [PAYMENT SIDE EFFECTS] Conversation unlocked (source: ${source})`,
      { bookingId, conversationId: conversation.id }
    );
  } catch (error) {
    console.error(
      `❌ [PAYMENT SIDE EFFECTS] Failed to unlock conversation (source: ${source}):`,
      error
    );
  }
}

/**
 * Side Effect 5: Revalidate Next.js Pages
 *
 * Revalidates Next.js pages to show fresh booking data.
 * - Confirmation page: Shows updated payment status
 * - Bookings dashboard: Shows booking in correct status group
 *
 * Note: Revalidates for all locales since payment callbacks don't have locale context
 */
async function revalidatePages(bookingId: string): Promise<void> {
  try {
    // Revalidate for all locales
    for (const locale of locales) {
      revalidatePath(`/${locale}/book/confirm`, "page");
      revalidatePath(`/${locale}/account/bookings`, "page");
    }

    console.log("✅ [PAYMENT SIDE EFFECTS] Pages revalidated successfully", {
      bookingId,
    });
  } catch (error) {
    console.error(
      "❌ [PAYMENT SIDE EFFECTS] Failed to revalidate pages:",
      error
    );
  }
}
