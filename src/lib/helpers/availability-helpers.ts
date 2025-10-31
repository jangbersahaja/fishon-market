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
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);

      const current = new Date(
        Math.max(periodStart.getTime(), startDate.getTime())
      );
      const end = new Date(Math.min(periodEnd.getTime(), endDate.getTime()));

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
