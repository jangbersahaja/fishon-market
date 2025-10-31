/**
 * Charter Availability API Client
 *
 * Fetches availability data from fishon-captain backend to determine
 * which dates should be blocked in the date picker.
 *
 * Blocked dates include:
 * 1. Non-operational days (based on schedule)
 * 2. Manually unavailable dates (captain blocks)
 * 3. Dates with PAID bookings
 */

const CAPTAIN_API_BASE =
  process.env.NEXT_PUBLIC_CAPTAIN_API_URL ||
  process.env.FISHON_CAPTAIN_API_URL ||
  "";

export interface CharterAvailability {
  schedule: {
    type: "EVERYDAY" | "WEEKDAYS" | "WEEKENDS" | "CUSTOM";
    operationalDays: number[]; // 0-6 (Sunday-Saturday)
  };
  unavailableDates: Array<{
    startDate: string; // YYYY-MM-DD
    endDate: string;
    reason: string | null;
  }>;
  dateAvailability: Array<{
    date: string; // YYYY-MM-DD
    available: boolean;
    reason?: string;
  }>;
}

/**
 * Fetch charter availability for a date range
 *
 * @param charterId - Charter ID
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Availability data or null if fetch fails
 */
export async function getCharterAvailability(
  charterId: string,
  startDate: Date,
  endDate: Date
): Promise<CharterAvailability | null> {
  if (!CAPTAIN_API_BASE) {
    console.warn("[availability-api] CAPTAIN_API_BASE not configured");
    return null;
  }

  try {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const url = `${CAPTAIN_API_BASE}/api/public/charters/${charterId}/availability?${params.toString()}`;

    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(
        "[availability-api] Failed to fetch availability:",
        response.status
      );
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[availability-api] Error fetching availability:", error);
    return null;
  }
}

/**
 * Calculate blocked dates from availability data
 *
 * Returns array of date strings (YYYY-MM-DD) that should be blocked
 * in the date picker.
 *
 * @param availability - Availability data from API
 * @returns Array of blocked date strings
 */
export function calculateBlockedDates(
  availability: CharterAvailability | null
): Set<string> {
  const blocked = new Set<string>();

  if (!availability) {
    return blocked;
  }

  // Add dates from dateAvailability where available = false
  availability.dateAvailability.forEach((item) => {
    if (!item.available) {
      blocked.add(item.date);
    }
  });

  return blocked;
}

/**
 * Check if a specific date is blocked
 *
 * @param date - Date to check (YYYY-MM-DD format)
 * @param blockedDates - Set of blocked date strings
 * @returns true if date is blocked
 */
export function isDateBlocked(
  date: string,
  blockedDates: Set<string>
): boolean {
  return blockedDates.has(date);
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
