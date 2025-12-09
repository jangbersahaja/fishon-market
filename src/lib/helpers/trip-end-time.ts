/**
 * Trip End Time Calculation Utility
 *
 * Centralizes the logic for determining when a trip ends.
 * Used by both the cron job and UI components for consistency.
 */

import {
  calculateTripEndTime,
  getMalaysianTime,
} from "./booking-status-helpers";

export interface TripEndTimeInput {
  date: Date;
  startTime: string | null;
  days: number;
  timeSlots?: Array<{
    day?: number;
    date?: string;
    startDateTime: string;
    endDateTime: string;
  }> | null;
}

export interface TripEndTimeResult {
  endDateTime: Date;
  method: "timeSlots" | "calculated";
  isExpired: boolean;
}

/**
 * Calculate when a trip ends
 *
 * @param input - Booking data with timeSlots support
 * @returns Object with end time, calculation method, and expiration status
 *
 * Priority:
 * 1. Use timeSlots[last].endDateTime if available (most accurate)
 * 2. Fallback to calculateTripEndTime() (8h/day assumption)
 */
export function getTripEndTime(input: TripEndTimeInput): TripEndTimeResult {
  let endDateTime: Date;
  let method: "timeSlots" | "calculated";

  // Priority 1: Use timeSlots if available and populated
  if (
    input.timeSlots &&
    Array.isArray(input.timeSlots) &&
    input.timeSlots.length > 0
  ) {
    const lastSlot = input.timeSlots[input.timeSlots.length - 1];
    endDateTime = new Date(lastSlot.endDateTime);
    method = "timeSlots";
  } else {
    // Priority 2: Fallback to calculated end time
    endDateTime = calculateTripEndTime({
      date: input.date,
      startTime: input.startTime,
      days: input.days,
    });
    method = "calculated";
  }

  const now = getMalaysianTime();
  const isExpired = now >= endDateTime;

  return {
    endDateTime,
    method,
    isExpired,
  };
}

/**
 * Check if a trip has ended (expired)
 *
 * @param input - Booking data
 * @returns true if current time is past trip end time
 */
export function hasTripEnded(input: TripEndTimeInput): boolean {
  const result = getTripEndTime(input);
  return result.isExpired;
}

/**
 * Get time remaining until trip ends
 *
 * @param input - Booking data
 * @returns Milliseconds until trip ends (negative if already ended)
 */
export function getTimeUntilTripEnds(input: TripEndTimeInput): number {
  const result = getTripEndTime(input);
  const now = getMalaysianTime();
  return result.endDateTime.getTime() - now.getTime();
}

/**
 * Get human-readable time remaining
 *
 * @param input - Booking data
 * @returns Object with days, hours, minutes remaining
 */
export function getTimeRemainingFormatted(input: TripEndTimeInput): {
  days: number;
  hours: number;
  minutes: number;
  totalMs: number;
  expired: boolean;
} {
  const totalMs = getTimeUntilTripEnds(input);
  const expired = totalMs < 0;

  const absTotalMs = Math.abs(totalMs);
  const days = Math.floor(absTotalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (absTotalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((absTotalMs % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, totalMs, expired };
}
