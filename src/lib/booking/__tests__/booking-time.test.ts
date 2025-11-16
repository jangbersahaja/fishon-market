import { describe, expect, it } from "vitest";
import {
  calculateTimeSlots,
  formatTimeRange,
  hasTimeConflict,
  timeRangesOverlap,
} from "../booking-time";

describe("booking-time", () => {
  describe("calculateTimeSlots", () => {
    it("should generate single slot for 1-day half-day trip", () => {
      const slots = calculateTimeSlots({
        date: "2025-06-01",
        startTime: "08:00",
        durationHours: 4,
        days: 1,
      });

      expect(slots).toHaveLength(1);
      expect(slots[0]).toEqual({
        day: 1,
        date: "2025-06-01",
        // 08:00 Malaysia time = 00:00 UTC
        startDateTime: "2025-06-01T00:00:00.000Z",
        // 12:00 Malaysia time = 04:00 UTC
        endDateTime: "2025-06-01T04:00:00.000Z",
      });
    });

    it("should generate multiple slots for multi-day trip", () => {
      const slots = calculateTimeSlots({
        date: "2025-06-01",
        startTime: "08:00",
        durationHours: 4,
        days: 3,
      });

      expect(slots).toHaveLength(3);
      expect(slots[0].day).toBe(1);
      expect(slots[1].day).toBe(2);
      expect(slots[2].day).toBe(3);
      // Dates remain in Malaysia local time
      expect(slots[0].date).toBe("2025-06-01");
      expect(slots[1].date).toBe("2025-06-02");
      expect(slots[2].date).toBe("2025-06-03");
    });

    it("should handle overnight trip (crosses midnight)", () => {
      const slots = calculateTimeSlots({
        date: "2025-06-01",
        startTime: "18:00",
        durationHours: 8,
        days: 1,
      });

      expect(slots).toHaveLength(1);
      // 18:00 Malaysia time = 10:00 UTC
      expect(slots[0].startDateTime).toBe("2025-06-01T10:00:00.000Z");
      // 02:00 Malaysia time (next day) = 18:00 UTC (same day)
      expect(slots[0].endDateTime).toBe("2025-06-01T18:00:00.000Z");
    });

    it("should handle full-day trip", () => {
      const slots = calculateTimeSlots({
        date: "2025-06-01",
        startTime: "08:00",
        durationHours: 8,
        days: 1,
      });

      expect(slots).toHaveLength(1);
      // 08:00 Malaysia time = 00:00 UTC
      expect(slots[0].startDateTime).toBe("2025-06-01T00:00:00.000Z");
      // 16:00 Malaysia time = 08:00 UTC
      expect(slots[0].endDateTime).toBe("2025-06-01T08:00:00.000Z");
    });

    it("should handle multi-day expedition (48 hours)", () => {
      const slots = calculateTimeSlots({
        date: "2025-06-01",
        startTime: "08:00",
        durationHours: 48,
        days: 2,
      });

      expect(slots).toHaveLength(1);
      // 08:00 Malaysia time on June 1 = 00:00 UTC
      expect(slots[0].startDateTime).toBe("2025-06-01T00:00:00.000Z");
      // 08:00 Malaysia time on June 3 = 00:00 UTC
      expect(slots[0].endDateTime).toBe("2025-06-03T00:00:00.000Z");
    });
  });

  describe("timeRangesOverlap", () => {
    it("should detect overlap when ranges intersect", () => {
      const range1 = {
        startDateTime: "2025-06-01T08:00:00.000Z",
        endDateTime: "2025-06-01T12:00:00.000Z",
      };
      const range2 = {
        startDateTime: "2025-06-01T10:00:00.000Z",
        endDateTime: "2025-06-01T14:00:00.000Z",
      };

      expect(timeRangesOverlap(range1, range2)).toBe(true);
    });

    it("should detect NO overlap when ranges are separate", () => {
      const range1 = {
        startDateTime: "2025-06-01T08:00:00.000Z",
        endDateTime: "2025-06-01T12:00:00.000Z",
      };
      const range2 = {
        startDateTime: "2025-06-01T14:00:00.000Z",
        endDateTime: "2025-06-01T18:00:00.000Z",
      };

      expect(timeRangesOverlap(range1, range2)).toBe(false);
    });

    it("should detect overlap when one range contains another", () => {
      const range1 = {
        startDateTime: "2025-06-01T08:00:00.000Z",
        endDateTime: "2025-06-01T16:00:00.000Z",
      };
      const range2 = {
        startDateTime: "2025-06-01T10:00:00.000Z",
        endDateTime: "2025-06-01T12:00:00.000Z",
      };

      expect(timeRangesOverlap(range1, range2)).toBe(true);
    });

    it("should detect NO overlap when ranges touch but don't overlap", () => {
      const range1 = {
        startDateTime: "2025-06-01T08:00:00.000Z",
        endDateTime: "2025-06-01T12:00:00.000Z",
      };
      const range2 = {
        startDateTime: "2025-06-01T12:00:00.000Z",
        endDateTime: "2025-06-01T16:00:00.000Z",
      };

      expect(timeRangesOverlap(range1, range2)).toBe(false);
    });

    it("should detect overlap for overnight trips", () => {
      const range1 = {
        startDateTime: "2025-06-01T18:00:00.000Z",
        endDateTime: "2025-06-02T02:00:00.000Z",
      };
      const range2 = {
        startDateTime: "2025-06-01T20:00:00.000Z",
        endDateTime: "2025-06-02T01:00:00.000Z",
      };

      expect(timeRangesOverlap(range1, range2)).toBe(true);
    });
  });

  describe("hasTimeConflict", () => {
    it("should detect conflict when time slots overlap", () => {
      const existingBookings = [
        {
          timeSlots: [
            {
              day: 1,
              date: "2025-06-01",
              startDateTime: "2025-06-01T08:00:00.000Z",
              endDateTime: "2025-06-01T12:00:00.000Z",
            },
          ],
        },
      ];

      const newTimeSlots = [
        {
          day: 1,
          date: "2025-06-01",
          startDateTime: "2025-06-01T10:00:00.000Z",
          endDateTime: "2025-06-01T14:00:00.000Z",
        },
      ];

      expect(hasTimeConflict(existingBookings, newTimeSlots)).toBe(true);
    });

    it("should detect NO conflict when time slots are separate", () => {
      const existingBookings = [
        {
          timeSlots: [
            {
              day: 1,
              date: "2025-06-01",
              startDateTime: "2025-06-01T08:00:00.000Z",
              endDateTime: "2025-06-01T12:00:00.000Z",
            },
          ],
        },
      ];

      const newTimeSlots = [
        {
          day: 1,
          date: "2025-06-01",
          startDateTime: "2025-06-01T14:00:00.000Z",
          endDateTime: "2025-06-01T18:00:00.000Z",
        },
      ];

      expect(hasTimeConflict(existingBookings, newTimeSlots)).toBe(false);
    });

    it("should skip bookings without timeSlots (legacy compatibility)", () => {
      const existingBookings = [
        {
          timeSlots: null,
        },
        {
          timeSlots: undefined,
        },
      ];

      const newTimeSlots = [
        {
          day: 1,
          date: "2025-06-01",
          startDateTime: "2025-06-01T08:00:00.000Z",
          endDateTime: "2025-06-01T12:00:00.000Z",
        },
      ];

      expect(hasTimeConflict(existingBookings, newTimeSlots)).toBe(false);
    });

    it("should detect conflict across multiple days", () => {
      const existingBookings = [
        {
          timeSlots: [
            {
              day: 1,
              date: "2025-06-01",
              startDateTime: "2025-06-01T08:00:00.000Z",
              endDateTime: "2025-06-01T12:00:00.000Z",
            },
            {
              day: 2,
              date: "2025-06-02",
              startDateTime: "2025-06-02T08:00:00.000Z",
              endDateTime: "2025-06-02T12:00:00.000Z",
            },
          ],
        },
      ];

      const newTimeSlots = [
        {
          day: 1,
          date: "2025-06-02",
          startDateTime: "2025-06-02T08:00:00.000Z",
          endDateTime: "2025-06-02T12:00:00.000Z",
        },
      ];

      expect(hasTimeConflict(existingBookings, newTimeSlots)).toBe(true);
    });
  });

  describe("formatTimeRange", () => {
    it("should format same-day range", () => {
      // Timestamps representing 08:00-12:00 Malaysia time (stored as 00:00-04:00 UTC)
      const formatted = formatTimeRange(
        "2025-06-01T00:00:00.000Z", // 08:00 Malaysia
        "2025-06-01T04:00:00.000Z" // 12:00 Malaysia
      );

      expect(formatted).toBe("8:00 AM - 12:00 PM");
    });

    it("should format overnight range (crosses midnight)", () => {
      // Timestamps representing 18:00 Malaysia → 02:00 Malaysia next day
      // (stored as 10:00 UTC → 18:00 UTC same day)
      const formatted = formatTimeRange(
        "2025-06-01T10:00:00.000Z", // 18:00 (6 PM) Malaysia June 1
        "2025-06-01T18:00:00.000Z" // 02:00 (2 AM) Malaysia June 2
      );

      expect(formatted).toBe("6:00 PM - 2:00 AM (next day)");
    });

    it("should format multi-day range", () => {
      // Timestamps representing 08:00 Malaysia on June 1 → 08:00 Malaysia on June 3
      // (stored as 00:00 UTC June 1 → 00:00 UTC June 3)
      const formatted = formatTimeRange(
        "2025-06-01T00:00:00.000Z", // 08:00 Malaysia June 1
        "2025-06-03T00:00:00.000Z" // 08:00 Malaysia June 3
      );

      expect(formatted).toBe("8:00 AM (Jun 1) - 8:00 AM (Jun 3)");
    });
  });
});
