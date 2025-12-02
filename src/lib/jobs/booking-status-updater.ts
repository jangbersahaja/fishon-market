/**
 * Booking Status Updater
 *
 * Automatically updates booking statuses:
 * - PENDING → EXPIRED (if expiresAt has passed and captain hasn't responded)
 * - PAID → COMPLETED (if trip end time has passed)
 */

import { prisma } from "@/lib/database/prisma";
import { prismaCaptain } from "@/lib/database/prisma-captain";
import {
  calculateTripEndTime,
  getMalaysianTime,
} from "@/lib/helpers/booking-status-helpers";
import { notifyReferralTripCompleted } from "@/lib/webhooks/captain-webhook";
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
 * Also triggers referral commission if captain was referred
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
        charterId: true,
        tripId: true,
        finalPrice: true,
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

          // Check if the captain was referred and trigger commission
          await checkAndTriggerReferralCommission(booking);
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
 * Check if captain was referred and trigger commission webhook
 * Only triggers for the captain's FIRST completed trip
 */
async function checkAndTriggerReferralCommission(booking: {
  id: string;
  charterId: string;
  tripId: string;
  finalPrice: unknown;
}): Promise<void> {
  try {
    // Skip if captain DB not configured
    if (!process.env.CAPTAIN_DATABASE_URL) {
      return;
    }

    // Get captain's user ID from charter in captain DB
    const charter = await prismaCaptain.$queryRaw<
      Array<{ ownerId: string; name: string }>
    >`
      SELECT "ownerId", name FROM "Charter" WHERE id = ${booking.charterId} LIMIT 1
    `;

    if (!charter.length) {
      console.log(
        `⚠️ [referral] Charter ${booking.charterId} not found in captain DB`
      );
      return;
    }

    const captainUserId = charter[0].ownerId;
    const tripName = charter[0].name;

    // Check if this captain was referred (has a Referral record as invitee)
    const referral = await prismaCaptain.$queryRaw<
      Array<{ id: string; status: string }>
    >`
      SELECT id, status FROM "Referral" WHERE "inviteeId" = ${captainUserId} LIMIT 1
    `;

    if (!referral.length) {
      // Captain was not referred, nothing to do
      return;
    }

    // Check if referral is already completed (commission already triggered)
    if (referral[0].status === "COMPLETED") {
      console.log(
        `ℹ️ [referral] Captain ${captainUserId} referral already completed`
      );
      return;
    }

    // Check if this is the captain's first completed booking
    const completedBookings = await prisma.booking.count({
      where: {
        charterId: booking.charterId,
        status: BookingStatus.COMPLETED,
      },
    });

    // Only trigger on first completed booking (count will be 1 after the update above)
    if (completedBookings > 1) {
      console.log(
        `ℹ️ [referral] Captain ${captainUserId} already has ${completedBookings} completed bookings`
      );
      return;
    }

    // Calculate captain's earnings (finalPrice is what angler paid)
    // Assuming captain gets most of it minus platform fee
    // For simplicity, use finalPrice as the earnings base
    const captainEarnings = Number(booking.finalPrice) || 0;

    console.log(
      `🎉 [referral] First trip completed for referred captain ${captainUserId}, earnings: RM${captainEarnings}`
    );

    // Send webhook to fishon-captain
    await notifyReferralTripCompleted({
      inviteeId: captainUserId,
      bookingId: booking.id,
      captainEarnings,
      tripName,
    });
  } catch (error) {
    // Don't fail the main job for referral errors
    console.error(
      `❌ [referral] Error checking referral for booking ${booking.id}:`,
      error
    );
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
