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
  // Time-based unavailability (Phase 2)
  isAllDay?: boolean;
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
}

export interface PartialAvailability {
  date: string; // YYYY-MM-DD
  unavailableTimeRanges: { startTime: string; endTime: string }[]; // HH:MM format
}

export interface BookedDatesResponse {
  fullDayBlocks: string[]; // YYYY-MM-DD dates that are fully blocked
  timeBasedBlocks: Array<{
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    isFullDay: boolean;
  }>;
}

/**
 * Calculate all blocked dates from schedule, unavailability, and bookings
 *
 * @param schedule - Charter operational schedule
 * @param unavailability - Captain-defined unavailable periods (with time-based support)
 * @param bookedDatesData - Booking data (full-day blocks + time-based blocks)
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Set of blocked date strings (YYYY-MM-DD)
 */
export function calculateBlockedDates(
  schedule: CharterSchedule | null | undefined,
  unavailability: UnavailabilityPeriod[] | null | undefined,
  bookedDatesData:
    | BookedDatesResponse
    | { bookedDates: string[] }
    | null
    | undefined,
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

  // 2. Add unavailability periods (ONLY ALL-DAY BLOCKS)
  // Time-based unavailability creates partial availability, not full blocks
  if (unavailability && unavailability.length > 0) {
    unavailability.forEach((period) => {
      // UPDATED: Only block date if isAllDay=true or undefined (backward compatibility)
      const isAllDayBlock = period.isAllDay !== false;

      if (!isAllDayBlock) {
        // Time-based unavailability - skip, will be handled by calculatePartialAvailability()
        return;
      }

      // Parse dates using local time (create Date from YYYY-MM-DD string or ISO string)
      const periodStartStr =
        typeof period.startDate === "string"
          ? period.startDate
          : formatDateYMD(period.startDate);
      const periodEndStr =
        typeof period.endDate === "string"
          ? period.endDate
          : formatDateYMD(period.endDate);

      // Extract just the YYYY-MM-DD part if ISO string (YYYY-MM-DDTHH:MM:SS)
      const startDateOnly = periodStartStr.split("T")[0];
      const endDateOnly = periodEndStr.split("T")[0];

      // Parse YYYY-MM-DD strings to local dates
      const [psy, psm, psd] = startDateOnly.split("-").map(Number);
      const [pey, pem, ped] = endDateOnly.split("-").map(Number);
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

  // 3. Add booked dates (ONLY FULL-DAY BLOCKS)
  // Time-based bookings will be handled by calculatePartialAvailability()
  if (bookedDatesData) {
    // Support both new format (BookedDatesResponse) and legacy format ({ bookedDates: string[] })
    if ("fullDayBlocks" in bookedDatesData) {
      // New format: only add full-day blocks
      bookedDatesData.fullDayBlocks.forEach((date) => blocked.add(date));
    } else if ("bookedDates" in bookedDatesData) {
      // Legacy format: treat all as full-day blocks
      bookedDatesData.bookedDates.forEach((date) => blocked.add(date));
    }
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
 * Calculate partial availability for dates with time-based unavailability
 *
 * @param unavailability - Captain-defined unavailable periods (with time-based support)
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Map of date strings to unavailable time ranges
 *
 * @example
 * // Morning unavailability (08:00-12:00)
 * {
 *   "2025-06-15": [{ startTime: "08:00", endTime: "12:00" }]
 * }
 */
export function calculatePartialAvailability(
  unavailability: UnavailabilityPeriod[] | null | undefined,
  bookedDatesData:
    | BookedDatesResponse
    | { bookedDates: string[] }
    | null
    | undefined,
  startDate: Date,
  endDate: Date
): Map<string, PartialAvailability> {
  const partialAvailabilityMap = new Map<string, PartialAvailability>();

  // Process unavailability periods
  if (unavailability && unavailability.length > 0) {
    unavailability.forEach((period) => {
      // Only process time-based unavailability (isAllDay=false)
      if (period.isAllDay !== false || !period.startTime || !period.endTime) {
        return;
      }

      // Parse date range
      const periodStartStr =
        typeof period.startDate === "string"
          ? period.startDate
          : formatDateYMD(period.startDate);
      const periodEndStr =
        typeof period.endDate === "string"
          ? period.endDate
          : formatDateYMD(period.endDate);

      const startDateOnly = periodStartStr.split("T")[0];
      const endDateOnly = periodEndStr.split("T")[0];

      const [psy, psm, psd] = startDateOnly.split("-").map(Number);
      const [pey, pem, ped] = endDateOnly.split("-").map(Number);
      const periodStart = new Date(psy, psm - 1, psd);
      const periodEnd = new Date(pey, pem - 1, ped);

      // Check if this is a single-day or multi-day period
      const isSingleDay =
        formatDateYMD(periodStart) === formatDateYMD(periodEnd);

      if (isSingleDay) {
        // Single day: apply the time range directly
        const dateStr = formatDateYMD(periodStart);
        const existing = partialAvailabilityMap.get(dateStr);

        if (existing) {
          existing.unavailableTimeRanges.push({
            startTime: period.startTime,
            endTime: period.endTime,
          });
        } else {
          partialAvailabilityMap.set(dateStr, {
            date: dateStr,
            unavailableTimeRanges: [
              {
                startTime: period.startTime,
                endTime: period.endTime,
              },
            ],
          });
        }
      } else {
        // Multi-day period: handle edge days specially
        const current = new Date(
          Math.max(periodStart.getTime(), startDate.getTime())
        );
        const end = new Date(Math.min(periodEnd.getTime(), endDate.getTime()));

        current.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        while (current <= end) {
          const dateStr = formatDateYMD(current);
          const isFirstDay = dateStr === formatDateYMD(periodStart);
          const isLastDay = dateStr === formatDateYMD(periodEnd);

          let timeRange: { startTime: string; endTime: string };

          if (isFirstDay) {
            // First day: from specified start time to end of day
            timeRange = {
              startTime: period.startTime,
              endTime: "23:59",
            };
          } else if (isLastDay) {
            // Last day: from start of day to specified end time
            timeRange = {
              startTime: "00:00",
              endTime: period.endTime,
            };
          } else {
            // Middle days: entire day blocked
            timeRange = {
              startTime: "00:00",
              endTime: "23:59",
            };
          }

          const existing = partialAvailabilityMap.get(dateStr);

          if (existing) {
            existing.unavailableTimeRanges.push(timeRange);
          } else {
            partialAvailabilityMap.set(dateStr, {
              date: dateStr,
              unavailableTimeRanges: [timeRange],
            });
          }

          current.setDate(current.getDate() + 1);
        }
      }
    });
  }

  // Process time-based bookings
  if (bookedDatesData && "timeBasedBlocks" in bookedDatesData) {
    bookedDatesData.timeBasedBlocks.forEach((block) => {
      const dateStr = block.date;
      const existing = partialAvailabilityMap.get(dateStr);

      if (existing) {
        // Add time range to existing entry
        existing.unavailableTimeRanges.push({
          startTime: block.startTime,
          endTime: block.endTime,
        });
      } else {
        // Create new entry
        partialAvailabilityMap.set(dateStr, {
          date: dateStr,
          unavailableTimeRanges: [
            {
              startTime: block.startTime,
              endTime: block.endTime,
            },
          ],
        });
      }
    });
  }

  return partialAvailabilityMap;
}

/**
 * Check if a charter is available on a specific date
 *
 * Checks:
 * 1. Advance booking requirement (48h for all, 72h for offshore)
 * 2. Schedule (operational days)
 * 3. Unavailability periods
 *
 * Does NOT check existing bookings (that requires server-side DB access).
 *
 * @param date - Date to check (YYYY-MM-DD string or Date object)
 * @param schedule - Charter operational schedule
 * @param unavailability - Captain-defined unavailable periods
 * @param fishingType - Type of fishing (e.g., "offshore", "inshore") for advance booking check
 * @returns Object with availability status and reason
 */
export function isCharterAvailableOnDate(
  date: string | Date,
  schedule: CharterSchedule | null | undefined,
  unavailability: UnavailabilityPeriod[] | null | undefined,
  fishingType?: string | null
): { isAvailable: boolean; reason?: string } {
  // Parse date
  const checkDate =
    typeof date === "string"
      ? (() => {
          const [y, m, d] = date.split("-").map(Number);
          return new Date(y, m - 1, d);
        })()
      : date;

  // 0. Check advance booking requirement (48h for all, 72h for offshore)
  const now = new Date();
  const isOffshore = fishingType?.toLowerCase() === "offshore";
  const hoursRequired = isOffshore ? 72 : 48;
  const minBookableTime = new Date(
    now.getTime() + hoursRequired * 60 * 60 * 1000
  );

  // Compare dates at midnight for fair comparison
  const checkDateMidnight = new Date(checkDate);
  checkDateMidnight.setHours(0, 0, 0, 0);
  const minBookableMidnight = new Date(minBookableTime);
  minBookableMidnight.setHours(0, 0, 0, 0);

  if (checkDateMidnight < minBookableMidnight) {
    return {
      isAvailable: false,
      reason: isOffshore ? "advance_booking_72h" : "advance_booking_48h",
    };
  }

  // 1. Check schedule (operational days)
  if (isDateBlockedBySchedule(checkDate, schedule)) {
    return { isAvailable: false, reason: "not_operational" };
  }

  // 2. Check unavailability periods (only all-day blocks)
  if (unavailability && unavailability.length > 0) {
    const dateStr = formatDateYMD(checkDate);

    for (const period of unavailability) {
      // Only check all-day blocks
      const isAllDayBlock = period.isAllDay !== false;
      if (!isAllDayBlock) continue;

      // Parse period dates
      const periodStartStr =
        typeof period.startDate === "string"
          ? period.startDate.split("T")[0]
          : formatDateYMD(period.startDate);
      const periodEndStr =
        typeof period.endDate === "string"
          ? period.endDate.split("T")[0]
          : formatDateYMD(period.endDate);

      // Check if date falls within period
      if (dateStr >= periodStartStr && dateStr <= periodEndStr) {
        return {
          isAvailable: false,
          reason: period.reason || "unavailable",
        };
      }
    }
  }

  return { isAvailable: true };
}

/**
 * ==========================================
 * BOOKING CONFLICT CHECKING (SERVER-ONLY)
 * ==========================================
 *
 * Server-only functions that require database access have been moved to:
 * @see availability-helpers.server.ts
 *
 * Functions available in the server module:
 * - checkDateAvailability()
 * - getNextAvailableDates()
 */
