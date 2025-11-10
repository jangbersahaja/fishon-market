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
      tripId: true,
      charterId: true,
      date: true,
      status: true,
      guestFirstName: true,
      guestLastName: true,
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
    userId: string | null;
    tripId: string;
    charterId: string;
    date: Date;
    status: string;
    guestFirstName: string | null;
    guestLastName: string | null;
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
    const user = booking.userId
      ? await prisma.user.findUnique({ where: { id: booking.userId } })
      : null;

    const anglerName =
      user?.name ||
      (booking.guestFirstName
        ? `${booking.guestFirstName} ${booking.guestLastName}`
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
      actionUrl: `/book/confirm?id=${booking.id}`,
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
 * Side Effect 3: Revalidate Pages
 *
 * Revalidates Next.js pages to show fresh booking data.
 * - Confirmation page: Shows updated payment status
 * - Bookings dashboard: Shows booking in correct status group
 */
async function revalidatePages(bookingId: string): Promise<void> {
  try {
    revalidatePath("/book/confirm", "page");
    revalidatePath("/account/bookings", "page");

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
