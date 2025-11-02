/**
 * Date Range Helpers
 *
 * Convert between date range formats:
 * - Range format: { startDate: string, endDate: string }
 * - Schema format: { date: Date, days: number }
 */

/**
 * Calculate number of days between two dates (inclusive)
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Number of days (minimum 1)
 *
 * @example
 * calculateDays("2025-12-16", "2025-12-17") // returns 2
 * calculateDays("2025-12-16", "2025-12-16") // returns 1
 */
export function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Inclusive count: same day = 1 day, next day = 2 days, etc.
  return Math.max(1, diffDays + 1);
}

/**
 * Calculate end date from start date and number of days
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param days - Number of days (minimum 1)
 * @returns End date string (YYYY-MM-DD)
 *
 * @example
 * calculateEndDate("2025-12-16", 2) // returns "2025-12-17"
 * calculateEndDate("2025-12-16", 1) // returns "2025-12-16"
 */
export function calculateEndDate(startDate: string, days: number): string {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  // days=1 means same day, days=2 means next day, etc.
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);

  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, "0");
  const d = String(end.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

/**
 * Convert date range to schema format (date + days)
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Schema format { date, days }
 *
 * @example
 * rangeToSchema("2025-12-16", "2025-12-17")
 * // returns { date: Date("2025-12-16"), days: 2 }
 */
export function rangeToSchema(
  startDate: string,
  endDate: string
): { date: Date; days: number } {
  const date = new Date(startDate);
  date.setHours(0, 0, 0, 0);

  const days = calculateDays(startDate, endDate);

  return { date, days };
}

/**
 * Convert schema format to date range
 *
 * @param date - Start date
 * @param days - Number of days
 * @returns Range format { startDate, endDate }
 *
 * @example
 * schemaToRange(new Date("2025-12-16"), 2)
 * // returns { startDate: "2025-12-16", endDate: "2025-12-17" }
 */
export function schemaToRange(
  date: Date,
  days: number
): { startDate: string; endDate: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const d = String(start.getDate()).padStart(2, "0");
  const startDate = `${y}-${m}-${d}`;

  const endDate = calculateEndDate(startDate, days);

  return { startDate, endDate };
}

/**
 * Validate date range
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Validation result with error message if invalid
 */
export function validateDateRange(
  startDate: string,
  endDate: string
): { valid: boolean; error?: string } {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: false, error: "Invalid date format" };
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (end < start) {
      return { valid: false, error: "End date must be after start date" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid date" };
  }
}

/**
 * Format date range for display
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param options - Formatting options
 * @returns Formatted date range string
 *
 * @example
 * formatDateRange("2025-12-16", "2025-12-17")
 * // returns "Dec 16 - Dec 17, 2025"
 *
 * formatDateRange("2025-12-16", "2025-12-16")
 * // returns "Dec 16, 2025"
 */
export function formatDateRange(
  startDate: string,
  endDate: string,
  options: {
    shortMonth?: boolean;
    showYear?: boolean;
  } = {}
): string {
  const { shortMonth = true, showYear = true } = options;

  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatter = new Intl.DateTimeFormat("en-US", {
    year: showYear ? "numeric" : undefined,
    month: shortMonth ? "short" : "long",
    day: "numeric",
  });

  // Same date - just show once
  if (startDate === endDate) {
    return formatter.format(start);
  }

  // Different dates - show range
  const startFormatted = formatter.format(start);
  const endFormatted = formatter.format(end);

  // Check if same month/year to optimize display
  if (
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    const monthYear = new Intl.DateTimeFormat("en-US", {
      month: shortMonth ? "short" : "long",
      year: showYear ? "numeric" : undefined,
    }).format(start);

    return `${start.getDate()} - ${end.getDate()} ${monthYear}`;
  }

  return `${startFormatted} - ${endFormatted}`;
}
