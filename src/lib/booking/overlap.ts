// Shared booking overlap utilities
// Contract:
// - addDays(dateUTC, n): returns new Date at UTC midnight + n days
// - rangesOverlap(aStart, aDays, bStart, bDays): true if [a..a+days-1] intersects [b..b+days-1]
// - hasConflicts(candidates, newStart, newDays, opts): determines if any overlapping booking conflicts.
//
// NEW: Time-based overlap detection using timeSlots JSON
// - If bookings have timeSlots array, check each slot for overlaps
// - Otherwise, fall back to legacy date-based detection

export interface TimeSlot {
  day: number;
  date: string;
  startDateTime: string;
  endDateTime: string;
}

export type CandidateBooking = {
  date: Date; // start date (assumed UTC midnight semantics)
  days: number;
  startTime: string | null;
  // New field for time-based detection
  timeSlots?: unknown; // JSON array from Prisma
};

export function addDaysUTC(date: Date, daysToAdd: number) {
  const dt = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  dt.setUTCDate(dt.getUTCDate() + daysToAdd);
  return dt;
}

export function rangesOverlap(
  aStart: Date,
  aDays: number,
  bStart: Date,
  bDays: number
) {
  const aEnd = addDaysUTC(aStart, Math.max(1, aDays) - 1);
  const bEnd = addDaysUTC(bStart, Math.max(1, bDays) - 1);
  return aStart <= bEnd && bStart <= aEnd;
}

export function hasConflicts(
  candidates: CandidateBooking[],
  newStart: Date,
  newDays: number,
  options: {
    usesStartTimes: boolean;
    selectedStartTime?: string | null;
    newTimeSlots?: TimeSlot[]; // New booking's time slots
  }
) {
  return candidates.some((b) => {
    // NEW: If we have timeSlots data for both bookings, use time-based detection
    if (
      b.timeSlots &&
      Array.isArray(b.timeSlots) &&
      options.newTimeSlots &&
      options.newTimeSlots.length > 0
    ) {
      const existingSlots = b.timeSlots as TimeSlot[];

      // Check if any slot from existing booking overlaps with any slot from new booking
      return existingSlots.some((existingSlot) =>
        options.newTimeSlots!.some((newSlot) => {
          const existingStart = new Date(existingSlot.startDateTime);
          const existingEnd = new Date(existingSlot.endDateTime);
          const newStart = new Date(newSlot.startDateTime);
          const newEnd = new Date(newSlot.endDateTime);

          // Time ranges overlap if: start1 < end2 AND start2 < end1
          return existingStart < newEnd && newStart < existingEnd;
        })
      );
    }

    // LEGACY: Fall back to date-based detection
    const bStart = new Date(
      Date.UTC(
        b.date.getUTCFullYear(),
        b.date.getUTCMonth(),
        b.date.getUTCDate()
      )
    );
    const overlap = rangesOverlap(
      bStart,
      Math.max(1, b.days),
      newStart,
      Math.max(1, newDays)
    );
    if (!overlap) return false;
    if (options.usesStartTimes) {
      const sel = options.selectedStartTime ?? null;
      return (b.startTime ?? null) === sel;
    }
    return true;
  });
}
