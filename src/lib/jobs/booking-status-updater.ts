/**
 * Booking Status Updater
 *
 * Automatically updates booking statuses:
 * - PENDING → EXPIRED (if expiresAt has passed and captain hasn't responded)
 * - PAID → COMPLETED (if trip end time has passed)
 */

import { prisma } from "@/lib/database/prisma";
import {
  calculateTripEndTime,
  getMalaysianTime,
} from "@/lib/helpers/booking-status-helpers";
import { BookingStatus } from "@prisma/client";

/**
 * Update expired pending and awaiting payment bookings
 * Changes PENDING → EXPIRED if expiresAt has passed (12 hours after creation, Manual flow only)
 * Changes AWAITING_PAYMENT → EXPIRED if paymentDeadline has passed (48 hours after approval)
 * Changes PAYMENT_AUTHORIZED → EXPIRED if acknowledgmentDeadline has passed (12 hours after payment, Auto flow)
 */
export async function updateExpiredBookings(): Promise<{
  updated: number;
  errors: number;
}> {
  const now = getMalaysianTime();
  let updated = 0;
  let errors = 0;

  try {
    // Find all PENDING bookings where expiresAt has passed (Manual flow: captain didn't respond)
    const expiredPendingBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
      },
    });

    // Find all AWAITING_PAYMENT bookings where paymentDeadline has passed
    const expiredPaymentBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.AWAITING_PAYMENT,
        paymentDeadline: {
          lt: now,
        },
      },
      select: {
        id: true,
        status: true,
        paymentDeadline: true,
      },
    });

    // Find all PAYMENT_AUTHORIZED bookings where acknowledgmentDeadline has passed (Auto flow: captain didn't acknowledge)
    const expiredAuthorizedBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PAYMENT_AUTHORIZED,
        acknowledgmentDeadline: {
          lt: now,
        },
      },
      select: {
        id: true,
        status: true,
        acknowledgmentDeadline: true,
      },
    });

    const expiredBookings = [
      ...expiredPendingBookings,
      ...expiredPaymentBookings,
      ...expiredAuthorizedBookings,
    ];

    console.log(
      `🔄 Found ${expiredBookings.length} expired bookings (PENDING: ${expiredPendingBookings.length}, AWAITING_PAYMENT: ${expiredPaymentBookings.length}, PAYMENT_AUTHORIZED: ${expiredAuthorizedBookings.length})`
    );

    // Update each booking to EXPIRED status
    for (const booking of expiredBookings) {
      try {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.EXPIRED,
            updatedAt: now,
          },
        });
        updated++;
        console.log(`✅ Updated booking ${booking.id} to EXPIRED`);
      } catch (error) {
        errors++;
        console.error(`❌ Failed to update booking ${booking.id}:`, error);
      }
    }

    return { updated, errors };
  } catch (error) {
    console.error("❌ Error in updateExpiredBookings:", error);
    return { updated: 0, errors: 1 };
  }
}

/**
 * Update completed paid bookings
 * Changes PAID → COMPLETED if trip end time has passed
 */
export async function updateCompletedBookings(): Promise<{
  updated: number;
  errors: number;
}> {
  const now = getMalaysianTime();
  let updated = 0;
  let errors = 0;

  try {
    // Find all PAID bookings (potential candidates for completion)
    const paidBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PAID,
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        days: true,
      },
    });

    console.log(
      `🔄 Checking ${paidBookings.length} PAID bookings for completion`
    );

    // Check each booking to see if trip has ended
    for (const booking of paidBookings) {
      try {
        const tripEndTime = calculateTripEndTime(booking);

        // If trip has ended, mark as COMPLETED
        if (now >= tripEndTime) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.COMPLETED,
              updatedAt: now,
            },
          });
          updated++;
          console.log(
            `✅ Updated booking ${
              booking.id
            } to COMPLETED (ended at ${tripEndTime.toISOString()})`
          );
        }
      } catch (error) {
        errors++;
        console.error(`❌ Failed to update booking ${booking.id}:`, error);
      }
    }

    return { updated, errors };
  } catch (error) {
    console.error("❌ Error in updateCompletedBookings:", error);
    return { updated: 0, errors: 1 };
  }
}

/**
 * Run all booking status updates
 */
export async function updateAllBookingStatuses(): Promise<{
  expired: { updated: number; errors: number };
  completed: { updated: number; errors: number };
}> {
  console.log("🚀 Starting booking status update job...");
  const startTime = Date.now();

  const expired = await updateExpiredBookings();
  const completed = await updateCompletedBookings();

  const duration = Date.now() - startTime;
  console.log(`✅ Booking status update completed in ${duration}ms`, {
    expired,
    completed,
  });

  return { expired, completed };
}
