/**
 * Availability Helpers
 *
 * Calculate blocked dates from charter data (schedule + unavailability + bookings).
 * Uses charter data already loaded from the database plus booked dates query.
 */

import type { CharterSchedule } from "@fishon/ui";

export interface UnavailabilityPeriod {
  startDate: string | Date; // YYYY-MM-DD or Date
  endDate: string | Date;
  reason?: string | null;
}

/**
 * Calculate all blocked dates from schedule, unavailability, and bookings
 *
 * @param schedule - Charter operational schedule
 * @param unavailability - Captain-defined unavailable periods
 * @param bookedDates - Dates with PAID bookings (array of date strings)
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Set of blocked date strings (YYYY-MM-DD)
 */
export function calculateBlockedDates(
  schedule: CharterSchedule | null | undefined,
  unavailability: UnavailabilityPeriod[] | null | undefined,
  bookedDates: string[] | null | undefined,
  startDate: Date,
  endDate: Date
): Set<string> {
  const blocked = new Set<string>();

  // 1. Add schedule-blocked dates
  const scheduleBlocked = calculateBlockedDatesFromSchedule(
    schedule,
    startDate,
    endDate
  );
  scheduleBlocked.forEach((date) => blocked.add(date));

  // 2. Add unavailability periods
  if (unavailability && unavailability.length > 0) {
    unavailability.forEach((period) => {
      // Parse dates using local time (create Date from YYYY-MM-DD string)
      const periodStartStr =
        typeof period.startDate === "string"
          ? period.startDate
          : formatDateYMD(period.startDate);
      const periodEndStr =
        typeof period.endDate === "string"
          ? period.endDate
          : formatDateYMD(period.endDate);

      // Parse YYYY-MM-DD strings to local dates
      const [psy, psm, psd] = periodStartStr.split("-").map(Number);
      const [pey, pem, ped] = periodEndStr.split("-").map(Number);
      const periodStart = new Date(psy, psm - 1, psd);
      const periodEnd = new Date(pey, pem - 1, ped);

      // Use local time comparison
      const current = new Date(
        Math.max(periodStart.getTime(), startDate.getTime())
      );
      const end = new Date(Math.min(periodEnd.getTime(), endDate.getTime()));

      // Normalize to local midnight
      current.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      while (current <= end) {
        blocked.add(formatDateYMD(current));
        current.setDate(current.getDate() + 1);
      }
    });
  }

  // 3. Add booked dates
  if (bookedDates && bookedDates.length > 0) {
    bookedDates.forEach((date) => blocked.add(date));
  }

  return blocked;
}

/**
 * Calculate blocked dates from charter schedule only
 *
 * @param schedule - Charter operational schedule
 * @param startDate - Start date of range
 * @param endDate - End date of range
 * @returns Set of blocked date strings (YYYY-MM-DD)
 */
export function calculateBlockedDatesFromSchedule(
  schedule: CharterSchedule | null | undefined,
  startDate: Date,
  endDate: Date
): Set<string> {
  const blocked = new Set<string>();

  if (!schedule) {
    // No schedule means no operational days defined - block all dates
    return blocked;
  }

  const { type, operationalDays } = schedule;

  // EVERYDAY schedule - no dates blocked
  if (type === "EVERYDAY") {
    return blocked;
  }

  // Generate all dates in range and check against schedule
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
    let isBlocked = false;

    switch (type) {
      case "WEEKDAYS":
        // Block weekends (Sunday=0, Saturday=6)
        isBlocked = dayOfWeek === 0 || dayOfWeek === 6;
        break;

      case "WEEKENDS":
        // Block weekdays (Monday=1 to Friday=5)
        isBlocked = dayOfWeek >= 1 && dayOfWeek <= 5;
        break;

      case "CUSTOM":
        // Block if day is NOT in operationalDays array
        isBlocked = !operationalDays.includes(dayOfWeek);
        break;
    }

    if (isBlocked) {
      blocked.add(formatDateYMD(current));
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  return blocked;
}

/**
 * Format Date object to YYYY-MM-DD string
 */
export function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Check if a specific date is blocked based on schedule
 *
 * @param date - Date to check
 * @param schedule - Charter operational schedule
 * @returns true if date is blocked
 */
export function isDateBlockedBySchedule(
  date: Date,
  schedule: CharterSchedule | null | undefined
): boolean {
  if (!schedule) return false;

  const { type, operationalDays } = schedule;

  if (type === "EVERYDAY") return false;

  const dayOfWeek = date.getDay();

  switch (type) {
    case "WEEKDAYS":
      return dayOfWeek === 0 || dayOfWeek === 6;

    case "WEEKENDS":
      return dayOfWeek >= 1 && dayOfWeek <= 5;

    case "CUSTOM":
      return !operationalDays.includes(dayOfWeek);

    default:
      return false;
  }
}

/**
 * ==========================================
 * BOOKING CONFLICT CHECKING
 * ==========================================
 */

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
