/**
 * Booking Time Calculation Utilities
 *
 * Handles calculation of timeSlots JSON array for bookings.
 * Each booking stores an array of individual trip instances with exact time ranges.
 *
 * TimeSlot structure:
 * {
 *   day: number,              // 1-indexed day number (1, 2, 3...)
 *   date: string,             // ISO date string "YYYY-MM-DD"
 *   startDateTime: string,    // ISO datetime string
 *   endDateTime: string       // ISO datetime string
 * }
 *
 * Examples:
 * 1. Half-day trip (4h), 2 days, start 08:00:
 *    [
 *      { day: 1, date: "2025-11-13", startDateTime: "2025-11-13T08:00:00.000Z", endDateTime: "2025-11-13T12:00:00.000Z" },
 *      { day: 2, date: "2025-11-14", startDateTime: "2025-11-14T08:00:00.000Z", endDateTime: "2025-11-14T12:00:00.000Z" }
 *    ]
 *
 * 2. Overnight trip (8h), 1 day, start 18:00:
 *    [
 *      { day: 1, date: "2025-11-13", startDateTime: "2025-11-13T18:00:00.000Z", endDateTime: "2025-11-14T02:00:00.000Z" }
 *    ]
 *
 * 3. Multi-day trip (48h), 1 booking:
 *    [
 *      { day: 1, date: "2025-11-13", startDateTime: "2025-11-13T08:00:00.000Z", endDateTime: "2025-11-15T08:00:00.000Z" }
 *    ]
 */

/**
 * TimeSlot type definition
 */
export interface TimeSlot {
  day: number;
  date: string; // ISO date string YYYY-MM-DD
  startDateTime: string; // ISO datetime string
  endDateTime: string; // ISO datetime string
}

/**
 * Parse time string (HH:MM) to hours and minutes
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hoursStr, minutesStr] = timeStr.split(":");
  return {
    hours: parseInt(hoursStr, 10),
    minutes: parseInt(minutesStr, 10),
  };
}

/**
 * Calculate timeSlots array for a booking
 *
 * @param date - Booking start date (YYYY-MM-DD or Date object)
 * @param startTime - Trip start time (HH:MM format, e.g., "08:00")
 * @param durationHours - Trip duration in hours (from Trip model)
 * @param days - Number of days booked (for multi-day bookings of same trip)
 * @returns Array of TimeSlot objects
 */
export function calculateTimeSlots(params: {
  date: Date | string;
  startTime: string;
  durationHours: number;
  days: number;
}): TimeSlot[] {
  const { date, startTime, durationHours, days } = params;

  // Parse the start date to UTC
  const startDate =
    typeof date === "string"
      ? new Date(date + "T00:00:00.000Z")
      : new Date(date);

  // Parse the start time
  const { hours, minutes } = parseTime(startTime);

  const timeSlots: TimeSlot[] = [];

  // If total duration spans multiple calendar days, create ONE slot
  // Otherwise create separate slots for each booking day
  const totalHours = durationHours;
  const spansMultipleDays = totalHours > 24;

  if (spansMultipleDays) {
    // Multi-day expedition: single continuous slot
    const tripStart = new Date(startDate);
    tripStart.setUTCHours(hours, minutes, 0, 0);

    const tripEnd = new Date(tripStart);
    tripEnd.setTime(tripEnd.getTime() + totalHours * 60 * 60 * 1000);

    const dateStr = tripStart.toISOString().split("T")[0];

    timeSlots.push({
      day: 1,
      date: dateStr,
      startDateTime: tripStart.toISOString(),
      endDateTime: tripEnd.toISOString(),
    });
  } else {
    // Generate a slot for each booking day (same trip repeated)
    for (let day = 0; day < days; day++) {
      const tripStart = new Date(startDate);
      tripStart.setTime(tripStart.getTime() + day * 24 * 60 * 60 * 1000);
      tripStart.setUTCHours(hours, minutes, 0, 0);

      const tripEnd = new Date(tripStart);
      tripEnd.setTime(tripEnd.getTime() + durationHours * 60 * 60 * 1000);

      // Format date as YYYY-MM-DD
      const dateStr = tripStart.toISOString().split("T")[0];

      timeSlots.push({
        day: day + 1, // 1-indexed
        date: dateStr,
        startDateTime: tripStart.toISOString(),
        endDateTime: tripEnd.toISOString(),
      });
    }
  }

  return timeSlots;
}

/**
 * Check if two time ranges overlap
 *
 * @param range1 - First time range { startDateTime, endDateTime }
 * @param range2 - Second time range { startDateTime, endDateTime }
 * @returns true if ranges overlap
 */
export function timeRangesOverlap(
  range1: { startDateTime: string; endDateTime: string },
  range2: { startDateTime: string; endDateTime: string }
): boolean {
  const start1 = new Date(range1.startDateTime);
  const end1 = new Date(range1.endDateTime);
  const start2 = new Date(range2.startDateTime);
  const end2 = new Date(range2.endDateTime);

  // Two ranges overlap if:
  // range1.start < range2.end AND range2.start < range1.end
  return start1 < end2 && start2 < end1;
}

/**
 * Check if a new booking would conflict with existing bookings
 *
 * @param existingBookings - Array of bookings with timeSlots JSON
 * @param newTimeSlots - New booking's time slots to check
 * @returns true if there's a conflict
 */
export function hasTimeConflict(
  existingBookings: Array<{
    timeSlots: unknown; // JSON from Prisma
  }>,
  newTimeSlots: TimeSlot[]
): boolean {
  return existingBookings.some((booking) => {
    // Skip bookings without time slot data (legacy bookings)
    if (!booking.timeSlots || !Array.isArray(booking.timeSlots)) {
      return false;
    }

    const existingSlots = booking.timeSlots as TimeSlot[];

    // Check if any slot from existing booking overlaps with any slot from new booking
    return existingSlots.some((existingSlot) =>
      newTimeSlots.some((newSlot) => timeRangesOverlap(existingSlot, newSlot))
    );
  });
}

/**
 * Format a time range for display
 */
export function formatTimeRange(
  startDateTime: string,
  endDateTime: string
): string {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Same day
  if (
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCDate() === end.getUTCDate()
  ) {
    return `${formatTime(start)} - ${formatTime(end)}`;
  }

  // Next day (overnight trip)
  const nextDay = new Date(start);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  if (
    nextDay.getUTCFullYear() === end.getUTCFullYear() &&
    nextDay.getUTCMonth() === end.getUTCMonth() &&
    nextDay.getUTCDate() === end.getUTCDate()
  ) {
    return `${formatTime(start)} - ${formatTime(end)} (next day)`;
  }

  // Multi-day trip
  return `${formatTime(start)} (${formatDate(start)}) - ${formatTime(end)} (${formatDate(end)})`;
}
