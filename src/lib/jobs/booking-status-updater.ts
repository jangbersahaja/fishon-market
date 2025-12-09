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
import { logger } from "@/lib/logger";
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

    logger.info("Found expired bookings", {
      total: expiredBookings.length,
      pending: expiredPendingBookings.length,
      awaitingPayment: expiredPaymentBookings.length,
      paymentAuthorized: expiredAuthorizedBookings.length,
    });

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
        logger.info("Updated booking to EXPIRED", { bookingId: booking.id });
      } catch (error) {
        errors++;
        logger.error("Failed to update booking to EXPIRED", {
          bookingId: booking.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { updated, errors };
  } catch (error) {
    logger.error("Error in updateExpiredBookings", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { updated: 0, errors: 1 };
  }
}

/**
 * Update completed paid bookings
 * Changes PAID → COMPLETED if trip end time has passed
 * Also triggers referral commission if captain was referred
 *
 * Priority for determining trip end time:
 * 1. Use timeSlots[last].endDateTime if timeSlots is populated
 * 2. Fallback to calculateTripEndTime() (8h/day assumption) if timeSlots is empty
 */
export async function updateCompletedBookings(): Promise<{
  updated: number;
  errors: number;
  details: Array<{ bookingId: string; method: string; tripEndTime: string }>;
}> {
  const now = getMalaysianTime();
  let updated = 0;
  let errors = 0;
  const details: Array<{
    bookingId: string;
    method: string;
    tripEndTime: string;
  }> = [];

  try {
    // Find all PAID bookings (potential candidates for completion)
    // Include timeSlots for accurate end time calculation
    const paidBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PAID,
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        days: true,
        timeSlots: true, // Include timeSlots for accurate calculation
        charterId: true,
        tripId: true,
        finalPrice: true,
      },
    });

    logger.info("Checking PAID bookings for completion", {
      count: paidBookings.length,
    });

    // Check each booking to see if trip has ended
    for (const booking of paidBookings) {
      try {
        // Determine trip end time using priority order
        let tripEndTime: Date;
        let calculationMethod: string;

        if (
          booking.timeSlots &&
          Array.isArray(booking.timeSlots) &&
          booking.timeSlots.length > 0
        ) {
          // Priority 1: Use last timeSlot's endDateTime (most accurate)
          const timeSlots = booking.timeSlots as Array<{
            day?: number;
            date?: string;
            startDateTime: string;
            endDateTime: string;
          }>;
          const lastSlot = timeSlots[timeSlots.length - 1];
          tripEndTime = new Date(lastSlot.endDateTime);
          calculationMethod = "timeSlots";
        } else {
          // Priority 2: Fallback to calculated end time (8h/day assumption)
          tripEndTime = calculateTripEndTime(booking);
          calculationMethod = "calculated";
        }

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
          details.push({
            bookingId: booking.id,
            method: calculationMethod,
            tripEndTime: tripEndTime.toISOString(),
          });
          logger.info("Updated booking to COMPLETED", {
            bookingId: booking.id,
            tripEndTime: tripEndTime.toISOString(),
            calculationMethod,
            timeDiffMs: now.getTime() - tripEndTime.getTime(),
          });

          // Check if the captain was referred and trigger commission
          await checkAndTriggerReferralCommission(booking);
        }
      } catch (error) {
        errors++;
        logger.error("Failed to update booking to COMPLETED", {
          bookingId: booking.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { updated, errors, details };
  } catch (error) {
    logger.error("Error in updateCompletedBookings", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { updated: 0, errors: 1, details: [] };
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
      logger.warn("Charter not found in captain DB for referral check", {
        charterId: booking.charterId,
      });
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
      logger.debug("Captain referral already completed", {
        captainUserId,
      });
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
      logger.debug("Captain already has multiple completed bookings", {
        captainUserId,
        completedBookings,
      });
      return;
    }

    // Calculate captain's earnings (finalPrice is what angler paid)
    // Assuming captain gets most of it minus platform fee
    // For simplicity, use finalPrice as the earnings base
    const captainEarnings = Number(booking.finalPrice) || 0;

    logger.info("First trip completed for referred captain", {
      captainUserId,
      captainEarnings,
      bookingId: booking.id,
    });

    // Send webhook to fishon-captain
    await notifyReferralTripCompleted({
      inviteeId: captainUserId,
      bookingId: booking.id,
      captainEarnings,
      tripName,
    });
  } catch (error) {
    // Don't fail the main job for referral errors
    logger.error("Error checking referral for booking", {
      bookingId: booking.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Run all booking status updates
 */
export async function updateAllBookingStatuses(): Promise<{
  expired: { updated: number; errors: number };
  completed: {
    updated: number;
    errors: number;
    details: Array<{ bookingId: string; method: string; tripEndTime: string }>;
  };
}> {
  logger.info("Starting booking status update job");
  const startTime = Date.now();

  const expired = await updateExpiredBookings();
  const completed = await updateCompletedBookings();

  const duration = Date.now() - startTime;
  logger.info("Booking status update completed", {
    duration,
    expired,
    completedSummary: {
      updated: completed.updated,
      errors: completed.errors,
      calculationMethods: completed.details.reduce(
        (acc, detail) => {
          acc[detail.method] = (acc[detail.method] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
  });

  return { expired, completed };
}
