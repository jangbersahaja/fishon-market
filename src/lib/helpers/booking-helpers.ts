/**
 * Booking utility helpers
 *
 * Provides helper functions for booking status colors, action buttons,
 * and business logic calculations.
 */

import type { BookingStatus } from "@/lib/services/booking-service";

/**
 * Get color classes for booking status badge
 * @param status - Booking status
 * @returns Tailwind color classes for badge
 */
export function getBookingStatusColor(status: BookingStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-red-100 text-red-800 border-red-200";
    case "AWAITING_PAYMENT":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "PAYMENT_AUTHORIZED":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "PAID":
      return "bg-green-100 text-green-800 border-green-200";
    case "UNDER_REVIEW":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 border-red-200";
    case "EXPIRED":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "CANCELLED":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "COMPLETED":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

/**
 * Get icon color class for booking status
 * @param status - Booking status
 * @returns Tailwind text color class
 */
export function getBookingStatusIconColor(status: BookingStatus): string {
  switch (status) {
    case "PENDING":
      return "text-red-600";
    case "AWAITING_PAYMENT":
      return "text-yellow-600";
    case "PAYMENT_AUTHORIZED":
      return "text-indigo-600";
    case "PAID":
      return "text-green-600";
    case "UNDER_REVIEW":
      return "text-purple-600";
    case "REJECTED":
      return "text-red-600";
    case "EXPIRED":
      return "text-orange-600";
    case "CANCELLED":
      return "text-gray-600";
    case "COMPLETED":
      return "text-gray-600";
    default:
      return "text-gray-600";
  }
}

/**
 * Get background color class for booking status icon container
 * @param status - Booking status
 * @returns Tailwind background color class
 */
export function getBookingStatusBgColor(status: BookingStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-red-50";
    case "AWAITING_PAYMENT":
      return "bg-yellow-50";
    case "PAYMENT_AUTHORIZED":
      return "bg-indigo-50";
    case "PAID":
      return "bg-green-50";
    case "UNDER_REVIEW":
      return "bg-purple-50";
    case "REJECTED":
      return "bg-red-50";
    case "EXPIRED":
      return "bg-orange-50";
    case "CANCELLED":
      return "bg-gray-50";
    case "COMPLETED":
      return "bg-gray-50";
    default:
      return "bg-gray-50";
  }
}

/**
 * Get user-friendly status label
 * @param status - Booking status
 * @returns Human-readable status label
 */
export function getBookingStatusLabel(status: BookingStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending Review";
    case "AWAITING_PAYMENT":
      return "Approved - Awaiting Payment";
    case "PAYMENT_AUTHORIZED":
      return "Payment Received - Pending Acknowledgment";
    case "PAID":
      return "Confirmed";
    case "UNDER_REVIEW":
      return "Under Review";
    case "REJECTED":
      return "Rejected";
    case "EXPIRED":
      return "Expired";
    case "CANCELLED":
      return "Cancelled";
    case "COMPLETED":
      return "Completed";
    default:
      return status;
  }
}

/**
 * Get status message for user
 * @param status - Booking status
 * @returns Helpful message explaining current status
 */
export function getBookingStatusMessage(status: BookingStatus): string {
  switch (status) {
    case "PENDING":
      return "Your booking request is under review by the captain. You'll be notified once it's approved.";
    case "AWAITING_PAYMENT":
      return "Your booking has been approved! Complete payment within 48 hours to confirm your trip.";
    case "PAYMENT_AUTHORIZED":
      return "Your payment has been received. Awaiting captain acknowledgment within 12 hours.";
    case "PAID":
      return "Your trip is confirmed. Check your email for details.";
    case "UNDER_REVIEW":
      return "Our team is reviewing this booking. We'll update you soon.";
    case "REJECTED":
      return "Unfortunately, your booking request was rejected. Try another charter or contact support.";
    case "EXPIRED":
      return "This booking request expired due to inactivity. Please create a new booking.";
    case "CANCELLED":
      return "This booking has been cancelled.";
    default:
      return "";
  }
}

/**
 * Check if a booking can be cancelled
 * @param status - Booking status
 * @returns True if booking can be cancelled
 */
export function canCancelBooking(status: BookingStatus): boolean {
  return (
    status === "PENDING" ||
    status === "AWAITING_PAYMENT" ||
    status === "PAYMENT_AUTHORIZED"
  );
}

/**
 * Get action button configuration for booking status
 * @param status - Booking status
 * @param bookingId - Booking ID
 * @returns Action button config or null if no action available
 */
export function getBookingActionButton(
  status: BookingStatus,
  bookingId: string
): {
  label: string;
  href: string;
  variant: "default" | "primary" | "secondary";
} | null {
  switch (status) {
    case "AWAITING_PAYMENT":
      return {
        label: "Pay Now",
        href: `/book/payment/${bookingId}`,
        variant: "primary",
      };
    case "PAID":
      return {
        label: "View Trip",
        href: `/book/confirm?id=${bookingId}`,
        variant: "default",
      };
    case "REJECTED":
      return {
        label: "Find Similar",
        href: "/search",
        variant: "secondary",
      };
    case "EXPIRED":
      return {
        label: "Book Again",
        href: "/search",
        variant: "secondary",
      };
    default:
      return null;
  }
}

/**
 * Calculate time remaining until expiry
 * @param expiresAt - Expiry date
 * @returns Object with time remaining info
 */
export function getTimeRemaining(expiresAt: Date): {
  isExpired: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  displayText: string;
} {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      isExpired: true,
      hoursRemaining: 0,
      minutesRemaining: 0,
      displayText: "Expired",
    };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let displayText = "";
  if (hours > 0) {
    displayText = `${hours}h ${minutes}m remaining`;
  } else {
    displayText = `${minutes}m remaining`;
  }

  return {
    isExpired: false,
    hoursRemaining: hours,
    minutesRemaining: minutes,
    displayText,
  };
}

/**
 * Format date for display
 * @param date - Date object
 * @returns Formatted date string (e.g., "Nov 15, 2025 - Thursday")
 */
export function formatBookingDate(date: Date): string {
  return new Intl.DateTimeFormat("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

/**
 * Format currency in Malaysian Ringgit
 * @param amount - Amount in cents/smallest unit
 * @returns Formatted currency string (e.g., "RM 350")
 */
export function formatCurrency(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY")}`;
}

/**
 * Calculate days until trip
 * @param tripDate - Trip date
 * @returns Number of days until trip (negative if past)
 */
export function getDaysUntilTrip(tripDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const trip = new Date(tripDate);
  trip.setHours(0, 0, 0, 0);
  const diff = trip.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get countdown text for upcoming trip
 * @param tripDate - Trip date
 * @returns User-friendly countdown text
 */
export function getTripCountdown(tripDate: Date): string {
  const days = getDaysUntilTrip(tripDate);

  if (days < 0) {
    return "Completed";
  } else if (days === 0) {
    return "Today";
  } else if (days === 1) {
    return "Tomorrow";
  } else if (days < 7) {
    return `In ${days} days`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `In ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  } else {
    const months = Math.floor(days / 30);
    return `In ${months} ${months === 1 ? "month" : "months"}`;
  }
}

/**
 * Convert 24-hour time to 12-hour format
 * @param startTime - Start time in 24-hour format (e.g., "14:30")
 * @returns Formatted time in 12-hour format (e.g., "2:30 PM")
 */
export function convert24to12Hour(startTime: string): string {
  // Split the time string into hours and minutes
  const [hours24, minutes] = startTime.split(":").map(Number);

  // Determine AM/PM
  const period = hours24 >= 12 ? "PM" : "AM";

  // Convert hours to 12-hour format
  let hours12 = hours24 % 12;
  // Handle midnight (00:xx becomes 12:xx AM)
  hours12 = hours12 === 0 ? 12 : hours12;

  // Format minutes to always have two digits
  const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;

  // Return the 12-hour formatted string
  return `${hours12}:${formattedMinutes} ${period}`;
}

/**
 * Format trip duration for display
 * @param durationHours - Duration in hours (optional)
 * @param days - Number of days (fallback)
 * @returns Formatted duration string (e.g., "8 hours", "2 days")
 */
export function formatTripDuration(
  durationHours?: number | null,
  days?: number
): string {
  if (durationHours && durationHours > 0) {
    return `${durationHours} ${durationHours === 1 ? "hour" : "hours"}`;
  }

  // Fallback: Calculate based on days (8 hours per day standard)
  if (days && days > 0) {
    const hours = days * 8;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return "Duration TBD";
}

/**
 * Urgency level for booking expiration UX
 */
export type UrgencyLevel = "low" | "medium" | "high" | "expired";

/**
 * Get urgency level based on time remaining until expiration
 * @param expiresAt - Expiration date, or null if no expiration
 * @returns Urgency level or null if no expiration
 *
 * Thresholds:
 * - expired: Past expiration time
 * - high: < 6 hours remaining
 * - medium: < 24 hours remaining
 * - low: >= 24 hours remaining
 */
export function getUrgencyLevel(expiresAt: Date | null): UrgencyLevel | null {
  if (!expiresAt) return null;

  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  // Already expired
  if (diff <= 0) {
    return "expired";
  }

  const hoursRemaining = diff / (1000 * 60 * 60);

  // < 6 hours = high urgency (red)
  if (hoursRemaining < 6) {
    return "high";
  }

  // < 24 hours = medium urgency (yellow)
  if (hoursRemaining < 24) {
    return "medium";
  }

  // >= 24 hours = low urgency (green)
  return "low";
}

/**
 * Format expiration time remaining for display
 * @param expiresAt - Expiration date
 * @returns Formatted time string
 *
 * Format:
 * - >= 1 hour: "24h 30m"
 * - < 1 hour: "45m 30s"
 * - Expired: "Expired"
 */
export function formatExpirationTime(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) {
    return "Expired";
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  // >= 1 hour: show "Xh Ym"
  if (hours >= 1) {
    return `${hours}h ${minutes}m`;
  }

  // < 1 hour: show "Xm Ys"
  return `${minutes}m ${seconds}s`;
}

/**
 * Get milliseconds remaining until expiration
 * @param expiresAt - Expiration date
 * @returns Milliseconds remaining (0 if expired, negative values treated as 0)
 */
export function getExpiresIn(expiresAt: Date): number {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  return Math.max(0, diff);
}

/**
 * Calculate minimum bookable date based on charter type and current time
 *
 * Rules:
 *
 * @param charterType - Type of fishing charter (e.g., "INSHORE", "OFFSHORE", "DEEP_SEA")
 * @returns Date object representing the earliest bookable date
 */
export function getMinimumBookableDate(charterType?: string): Date {
  const now = new Date();

  // Base requirement: 48 hours for all trip types (UPDATED from 24h)
  let hoursRequired = 48;

  // Offshore requires additional 24 hours (72 hours total) (UPDATED from 36h)
  if (charterType?.toUpperCase() === "OFFSHORE") {
    hoursRequired = 72;
  }

  // Calculate minimum date
  const minDate = new Date(now.getTime() + hoursRequired * 60 * 60 * 1000);
  minDate.setHours(0, 0, 0, 0); // Set to midnight of that day

  return minDate;
}

/**
 * Check if a date meets the advance booking requirement
 *
 * @param date - Date to check (YYYY-MM-DD string)
 * @param charterType - Type of fishing charter
 * @returns True if date is bookable, false otherwise
 */
export function isDateBookable(date: string, charterType?: string): boolean {
  const minDate = getMinimumBookableDate(charterType);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return checkDate >= minDate;
}

/**
 * Get user-friendly message about advance booking requirements
 *
 * @param charterType - Type of fishing charter
 * @returns Message explaining advance booking requirement
 */
export function getAdvanceBookingMessage(charterType?: string): string {
  const isOffshore = charterType?.toUpperCase() === "OFFSHORE";

  if (isOffshore) {
    return "Offshore trips require booking at least 72 hours (3 days) in advance to allow proper preparation.";
  }

  return "Bookings must be made at least 48 hours (2 days) in advance to allow captain preparation time.";
}

/**
 * Get advance booking hours required based on charter type
 *
 * @param charterType - Type of fishing charter
 * @returns Number of hours required in advance
 */
export function getAdvanceBookingHours(charterType?: string): number {
  const isOffshore = charterType?.toUpperCase() === "OFFSHORE";
  return isOffshore ? 72 : 48;
}

/**
 * Calculate payment deadline for MANUAL flow bookings
 *
 * The payment deadline is calculated as the MINIMUM of:
 * 1. Standard 48 hours from approval
 * 2. Trip start time minus a buffer (to ensure payment before trip)
 *
 * This prevents scenarios where payment deadline extends past the trip date.
 *
 * @param tripDate - The booking trip date
 * @param startTime - The trip start time (e.g., "08:00") or null
 * @param bufferHours - Minimum hours before trip that payment must complete (default: 6h)
 * @returns Object with paymentDeadline Date and metadata about calculation
 */
export function calculatePaymentDeadline(
  tripDate: Date,
  startTime: string | null,
  bufferHours: number = 6
): {
  paymentDeadline: Date;
  hoursUntilDeadline: number;
  wasAdjusted: boolean;
  adjustmentReason?: string;
} {
  const now = new Date();

  // Calculate trip start datetime
  const tripStart = new Date(tripDate);
  if (startTime) {
    const [hours, minutes] = startTime.split(":").map(Number);
    tripStart.setHours(hours || 6, minutes || 0, 0, 0); // Default to 6 AM if parsing fails
  } else {
    tripStart.setHours(6, 0, 0, 0); // Default to 6 AM for safety
  }

  // Calculate latest possible payment time (trip start minus buffer)
  const latestPaymentTime = new Date(
    tripStart.getTime() - bufferHours * 60 * 60 * 1000
  );

  // Standard 48-hour deadline from now
  const STANDARD_PAYMENT_HOURS = 48;
  const standardDeadline = new Date(
    now.getTime() + STANDARD_PAYMENT_HOURS * 60 * 60 * 1000
  );

  // Use whichever is earlier
  const wasAdjusted = latestPaymentTime < standardDeadline;
  const paymentDeadline = wasAdjusted ? latestPaymentTime : standardDeadline;

  // Ensure deadline is at least a reasonable minimum from now (e.g., 2 hours)
  const MIN_DEADLINE_HOURS = 2;
  const minimumDeadline = new Date(
    now.getTime() + MIN_DEADLINE_HOURS * 60 * 60 * 1000
  );

  let finalDeadline = paymentDeadline;
  let adjustmentReason: string | undefined;

  if (paymentDeadline < minimumDeadline) {
    // Edge case: trip is too soon, captain shouldn't have approved
    // Give at least 2 hours but flag this as urgent
    finalDeadline = minimumDeadline;
    adjustmentReason = "Trip too soon - minimum 2h deadline applied";
  } else if (wasAdjusted) {
    adjustmentReason = `Adjusted to ensure ${bufferHours}h buffer before trip`;
  }

  const hoursUntilDeadline = Math.max(
    0,
    (finalDeadline.getTime() - now.getTime()) / (60 * 60 * 1000)
  );

  return {
    paymentDeadline: finalDeadline,
    hoursUntilDeadline: Math.round(hoursUntilDeadline * 10) / 10, // Round to 1 decimal
    wasAdjusted,
    adjustmentReason,
  };
}

/**
 * Format payment deadline for display
 *
 * @param hoursUntilDeadline - Hours until payment deadline
 * @returns Human-readable string like "48 hours", "24 hours", "12 hours", etc.
 */
export function formatPaymentDeadline(hoursUntilDeadline: number): string {
  if (hoursUntilDeadline >= 48) {
    return "48 hours";
  } else if (hoursUntilDeadline >= 24) {
    return `${Math.round(hoursUntilDeadline)} hours`;
  } else if (hoursUntilDeadline >= 1) {
    return `${Math.round(hoursUntilDeadline)} hours`;
  } else {
    const minutes = Math.round(hoursUntilDeadline * 60);
    return `${minutes} minutes`;
  }
}
