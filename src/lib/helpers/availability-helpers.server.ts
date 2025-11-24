/**
 * Server-Only Availability Helpers
 *
 * Functions that require database access (Prisma).
 * MUST only be imported in Server Components or Server Actions.
 */

import "server-only";

import { hasConflicts } from "@/lib/booking/overlap";
import { prisma } from "@/lib/database/prisma";

export interface AvailabilityCheckResult {
  /** Whether the date/time is available for booking */
  isAvailable: boolean;
  /** Number of conflicting PAID bookings found */
  conflictCount: number;
  /** IDs of conflicting bookings (if any) */
  conflictingBookingIds: string[];
}

export interface DateAvailabilityOptions {
  /** Charter ID to check availability for */
  charterId: string;
  /** Date to check (should be at UTC midnight) */
  date: Date;
  /** Number of consecutive days */
  days: number;
  /** Start time for the trip (e.g., "08:00"), null if no specific start time */
  startTime?: string | null;
  /** Booking ID to exclude from conflict check (for checking current booking) */
  excludeBookingId?: string;
}

/**
 * Check if a charter date is available for booking (no PAID conflicts)
 *
 * A date is considered UNAVAILABLE if there are any PAID bookings
 * that overlap with the requested date range and start time.
 *
 * @param options - Date availability check options
 * @returns Availability check result with conflict details
 *
 * @example
 * ```typescript
 * const result = await checkDateAvailability({
 *   charterId: "charter-123",
 *   date: new Date("2025-04-24"),
 *   days: 1,
 *   startTime: "08:00",
 * });
 *
 * if (!result.isAvailable) {
 *   console.log(`Date blocked by ${result.conflictCount} booking(s)`);
 * }
 * ```
 */
export async function checkDateAvailability(
  options: DateAvailabilityOptions
): Promise<AvailabilityCheckResult> {
  const { charterId, date, days, startTime, excludeBookingId } = options;

  // Normalize date to UTC midnight
  const normalizedDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

  // Calculate the date range we're checking
  // For multi-day booking: requested dates are [date, date+1, ..., date+days-1]
  const requestEndDate = new Date(normalizedDate);
  requestEndDate.setUTCDate(requestEndDate.getUTCDate() + days - 1);

  // Query for PAID bookings that OVERLAP with our requested date range
  // A booking overlaps if:
  // - booking.date <= requestEndDate (booking starts before or on our end date)
  // - booking.date + booking.days - 1 >= normalizedDate (booking ends on or after our start date)
  //
  // For simplicity, we'll fetch all bookings that START before our end date,
  // then filter in code for those that actually overlap
  const whereClause: any = {
    charterId,
    date: {
      lte: requestEndDate, // Booking starts before or on our end date
    },
    status: "PAID",
  };

  // Exclude specific booking if provided (for checking current booking)
  if (excludeBookingId) {
    whereClause.id = { not: excludeBookingId };
  }

  const allBookings = await prisma.booking.findMany({
    where: whereClause,
    select: {
      id: true,
      date: true,
      startTime: true,
      days: true,
      status: true,
    },
  });

  // Filter to only bookings that actually overlap with our requested range
  // Booking overlaps if its end date >= our start date
  const candidateBookings = allBookings.filter((booking) => {
    const bookingEndDate = new Date(booking.date);
    bookingEndDate.setUTCDate(bookingEndDate.getUTCDate() + booking.days - 1);
    return bookingEndDate >= normalizedDate;
  });

  console.log("📊 [AVAILABILITY] Found candidate PAID bookings:", {
    count: candidateBookings.length,
    bookings: candidateBookings.map((b) => ({
      id: b.id,
      date: b.date,
      startTime: b.startTime,
      days: b.days,
    })),
    checkingAgainst: {
      date: normalizedDate,
      startTime,
      days,
      excludeBookingId,
    },
  });

  // Check for overlapping bookings using the overlap helper
  const usesStartTimes = !!startTime;
  const conflicts = hasConflicts(candidateBookings, normalizedDate, days, {
    usesStartTimes,
    selectedStartTime: startTime ?? null,
  });

  console.log("🎯 [AVAILABILITY] Conflict check result:", {
    hasConflicts: conflicts,
    usesStartTimes,
    selectedStartTime: startTime ?? null,
  });

  return {
    isAvailable: !conflicts,
    conflictCount: conflicts ? candidateBookings.length : 0,
    conflictingBookingIds: conflicts ? candidateBookings.map((b) => b.id) : [],
  };
}

/**
 * Get next N available dates for a charter (excludes PAID bookings)
 *
 * Scans forward from startDate to find available dates.
 * Stops after finding the requested number of available dates or reaching maxDaysAhead.
 *
 * @param charterId - Charter ID
 * @param startDate - Date to start scanning from (defaults to today)
 * @param count - Number of available dates to find (default: 5)
 * @param days - Number of days per booking (default: 1)
 * @param startTime - Optional start time filter
 * @param maxDaysAhead - Maximum days to scan ahead (default: 90)
 * @returns Array of available dates
 *
 * @example
 * ```typescript
 * // Find next 5 available dates starting today
 * const availableDates = await getNextAvailableDates("charter-123", new Date(), 5);
 * ```
 */
export async function getNextAvailableDates(
  charterId: string,
  startDate: Date = new Date(),
  count: number = 5,
  days: number = 1,
  startTime?: string | null,
  maxDaysAhead: number = 90
): Promise<Date[]> {
  const availableDates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  // Don't scan past dates
  if (currentDate < today) {
    currentDate = today;
  }

  let daysScanned = 0;

  while (availableDates.length < count && daysScanned < maxDaysAhead) {
    const result = await checkDateAvailability({
      charterId,
      date: currentDate,
      days,
      startTime,
    });

    if (result.isAvailable) {
      availableDates.push(new Date(currentDate));
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    daysScanned++;
  }

  return availableDates;
}
