/**
 * Booking Status Helpers
 * Utilities for determining booking lifecycle states
 */

import { BookingStatus } from "@prisma/client";

// Minimal booking interface for status checking
interface BookingForStatus {
  date: Date;
  startTime: string | null;
  days: number;
  status: BookingStatus;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
}

/**
 * Get current time in Malaysian timezone (MYT/UTC+8)
 */
export function getMalaysianTime(): Date {
  const now = new Date();
  // Convert to Malaysian time (UTC+8)
  const malaysianTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" })
  );
  return malaysianTime;
}

/**
 * Calculate trip start time in Malaysian timezone
 */
export function calculateTripStartTime(booking: {
  date: Date;
  startTime: string | null;
}): Date {
  const { date, startTime } = booking;

  // Parse the date string as Malaysian time
  const tripStart = new Date(date);

  // If startTime exists (e.g., "08:00"), parse and set the time
  if (startTime) {
    const [hours, minutes] = startTime.split(":").map(Number);
    tripStart.setHours(hours || 0, minutes || 0, 0, 0);
  } else {
    // Default to start of day if no startTime
    tripStart.setHours(0, 0, 0, 0);
  }

  return tripStart;
}

/**
 * Calculate trip end time based on booking date, startTime, and days
 *
 * FALLBACK ONLY - Use for bookings without timeSlots data
 * Assumes 8-hour fishing trips per day (standard charter duration)
 *
 * NOTE: For accurate end times, use timeSlots[last].endDateTime instead
 * This function exists for backwards compatibility
 */
export function calculateTripEndTime(booking: {
  date: Date;
  startTime: string | null;
  days: number;
}): Date {
  const { days } = booking;

  const tripStart = calculateTripStartTime(booking);

  // Add the duration in days
  // Assuming 8-hour fishing trips (standard charter duration)
  // WARNING: This is a fallback assumption and may be inaccurate
  const tripDurationHours = days * 8;
  const tripEnd = new Date(tripStart);
  tripEnd.setHours(tripEnd.getHours() + tripDurationHours);

  return tripEnd;
}

/**
 * Check if a booking's trip is currently happening (started but not ended)
 */
export function isTripInProgress(booking: BookingForStatus): boolean {
  if (booking.status !== BookingStatus.PAID) {
    return false;
  }

  const tripStartTime = calculateTripStartTime(booking);
  const tripEndTime = calculateTripEndTime(booking);
  const now = getMalaysianTime();

  return now >= tripStartTime && now < tripEndTime;
}

/**
 * Check if a booking's trip has been completed (trip end time has passed)
 *
 * Uses same priority as cron job:
 * 1. Check database status first
 * 2. Use timeSlots[last].endDateTime if available
 * 3. Fallback to calculated end time (8h/day assumption)
 */
export function isTripCompleted(
  booking: BookingForStatus & { timeSlots?: unknown }
): boolean {
  // Check database status first
  if (booking.status === BookingStatus.COMPLETED) {
    return true;
  }

  // Fallback: Calculate if trip should be completed (for PAID bookings not yet updated by cron)
  if (booking.status !== BookingStatus.PAID) {
    return false;
  }

  let tripEndTime: Date;

  // Priority 1: Use timeSlots if available
  if (
    booking.timeSlots &&
    Array.isArray(booking.timeSlots) &&
    booking.timeSlots.length > 0
  ) {
    const timeSlots = booking.timeSlots as Array<{
      day?: number;
      date?: string;
      startDateTime: string;
      endDateTime: string;
    }>;
    const lastSlot = timeSlots[timeSlots.length - 1];
    tripEndTime = new Date(lastSlot.endDateTime);
  } else {
    // Priority 2: Fallback to calculated end time
    tripEndTime = calculateTripEndTime(booking);
  }

  const now = getMalaysianTime();
  const isCompleted = now >= tripEndTime;

  if (process.env.NODE_ENV === "development") {
    console.log("🕐 Trip completion check:", {
      bookingId: (booking as any).id,
      now: now.toISOString(),
      nowMYT: now.toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }),
      tripEndTime: tripEndTime.toISOString(),
      tripEndTimeMYT: tripEndTime.toLocaleString("en-MY", {
        timeZone: "Asia/Kuala_Lumpur",
      }),
      isCompleted,
    });
  }

  return isCompleted;
}

/**
 * Check if booking is in "In Progress" state
 */
export function isInProgress(booking: BookingForStatus): boolean {
  // PENDING - Manual flow: waiting for captain approval
  // PAYMENT_AUTHORIZED - Auto flow: payment received, waiting for captain acknowledgment
  // AWAITING_PAYMENT - Manual flow: approved, waiting for payment
  // PAID (future) - trip confirmed, waiting for trip date
  if (
    booking.status === BookingStatus.PENDING ||
    booking.status === BookingStatus.PAYMENT_AUTHORIZED ||
    booking.status === BookingStatus.AWAITING_PAYMENT
  ) {
    return true;
  }

  if (booking.status === BookingStatus.PAID) {
    return !isTripCompleted(booking); // PAID but trip not completed yet
  }

  return false;
}

/**
 * Check if booking is "Completed"
 * Uses COMPLETED status from database
 */
export function isCompleted(booking: BookingForStatus): boolean {
  return booking.status === BookingStatus.COMPLETED;
}

/**
 * Check if booking is "Cancelled"
 */
export function isCancelled(booking: BookingForStatus): boolean {
  return (
    booking.status === BookingStatus.REJECTED ||
    booking.status === BookingStatus.EXPIRED ||
    booking.status === BookingStatus.CANCELLED
  );
}

/**
 * Get cancellation reason display text
 */
export function getCancellationReason(booking: BookingForStatus): {
  title: string;
  description: string;
} {
  switch (booking.status) {
    case BookingStatus.REJECTED:
      return {
        title: "Rejected by Captain",
        description:
          booking.rejectionReason ||
          "The captain is unable to accommodate this booking.",
      };
    case BookingStatus.EXPIRED:
      return {
        title: "Booking Expired",
        description:
          "The captain didn't respond within 12 hours. Your booking has been automatically cancelled.",
      };
    case BookingStatus.CANCELLED:
      return {
        title: "Cancelled by You",
        description:
          booking.cancellationReason || "You cancelled this booking.",
      };
    default:
      return {
        title: "Cancelled",
        description: "This booking was cancelled.",
      };
  }
}

/**
 * Categorize booking into tab groups
 */
export type BookingTab = "in-progress" | "completed" | "cancelled";

export function getBookingTab(booking: BookingForStatus): BookingTab {
  if (isInProgress(booking)) return "in-progress";
  if (isCompleted(booking)) return "completed";
  if (isCancelled(booking)) return "cancelled";
  return "in-progress"; // fallback
}
