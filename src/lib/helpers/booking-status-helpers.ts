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
 */
export function isTripCompleted(booking: BookingForStatus): boolean {
  // Check database status first
  if (booking.status === BookingStatus.COMPLETED) {
    return true;
  }

  // Fallback: Calculate if trip should be completed (for PAID bookings not yet updated by cron)
  if (booking.status !== BookingStatus.PAID) {
    return false;
  }

  const tripEndTime = calculateTripEndTime(booking);
  const now = getMalaysianTime();

  console.log("🕐 Trip completion check:", {
    now: now.toISOString(),
    nowMYT: now.toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }),
    tripEndTime: tripEndTime.toISOString(),
    tripEndTimeMYT: tripEndTime.toLocaleString("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
    }),
    isCompleted: now >= tripEndTime,
  });

  return now >= tripEndTime;
}

/**
 * Check if booking is in "In Progress" state
 */
export function isInProgress(booking: BookingForStatus): boolean {
  // PENDING - waiting for captain approval
  // APPROVED - waiting for payment
  // PAID (future) - trip confirmed, waiting for trip date
  if (
    booking.status === BookingStatus.PENDING ||
    booking.status === BookingStatus.APPROVED
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
