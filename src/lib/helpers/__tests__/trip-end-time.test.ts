import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTimeRemainingFormatted,
  getTripEndTime,
  hasTripEnded,
} from "../trip-end-time";

describe("trip-end-time utilities", () => {
  const mockNow = new Date("2025-12-09T10:00:00Z");

  beforeEach(() => {
    // Mock getMalaysianTime to return consistent time
    vi.mock("../booking-status-helpers", () => ({
      getMalaysianTime: () => mockNow,
      calculateTripEndTime: vi.fn((booking) => {
        const start = new Date(booking.date);
        if (booking.startTime) {
          const [hours, minutes] = booking.startTime.split(":").map(Number);
          start.setHours(hours, minutes, 0, 0);
        }
        start.setHours(start.getHours() + booking.days * 8);
        return start;
      }),
    }));
  });

  describe("getTripEndTime", () => {
    it("should use timeSlots when available", () => {
      const input = {
        date: new Date("2025-12-10"),
        startTime: "08:00",
        days: 1,
        timeSlots: [
          {
            day: 1,
            date: "2025-12-10",
            startDateTime: "2025-12-10T08:00:00Z",
            endDateTime: "2025-12-10T12:00:00Z",
          },
        ],
      };

      const result = getTripEndTime(input);

      expect(result.method).toBe("timeSlots");
      expect(result.endDateTime).toEqual(new Date("2025-12-10T12:00:00Z"));
    });

    it("should use calculated time when timeSlots is empty", () => {
      const input = {
        date: new Date("2025-12-10"),
        startTime: "08:00",
        days: 1,
        timeSlots: [],
      };

      const result = getTripEndTime(input);

      expect(result.method).toBe("calculated");
    });

    it("should use calculated time when timeSlots is null", () => {
      const input = {
        date: new Date("2025-12-10"),
        startTime: "08:00",
        days: 1,
        timeSlots: null,
      };

      const result = getTripEndTime(input);

      expect(result.method).toBe("calculated");
    });

    it("should handle multi-day trips with multiple timeSlots", () => {
      const input = {
        date: new Date("2025-12-10"),
        startTime: "08:00",
        days: 3,
        timeSlots: [
          {
            day: 1,
            date: "2025-12-10",
            startDateTime: "2025-12-10T08:00:00Z",
            endDateTime: "2025-12-10T16:00:00Z",
          },
          {
            day: 2,
            date: "2025-12-11",
            startDateTime: "2025-12-11T08:00:00Z",
            endDateTime: "2025-12-11T16:00:00Z",
          },
          {
            day: 3,
            date: "2025-12-12",
            startDateTime: "2025-12-12T08:00:00Z",
            endDateTime: "2025-12-12T16:00:00Z",
          },
        ],
      };

      const result = getTripEndTime(input);

      expect(result.method).toBe("timeSlots");
      expect(result.endDateTime).toEqual(new Date("2025-12-12T16:00:00Z"));
    });
  });

  describe("hasTripEnded", () => {
    it("should return true if current time is past trip end", () => {
      const input = {
        date: new Date("2025-12-09"),
        startTime: "08:00",
        days: 1,
        timeSlots: [
          {
            day: 1,
            date: "2025-12-09",
            startDateTime: "2025-12-09T08:00:00Z",
            endDateTime: "2025-12-09T09:00:00Z", // 1 hour ago
          },
        ],
      };

      const result = hasTripEnded(input);

      expect(result).toBe(true);
    });

    it("should return false if current time is before trip end", () => {
      const input = {
        date: new Date("2025-12-10"),
        startTime: "08:00",
        days: 1,
        timeSlots: [
          {
            day: 1,
            date: "2025-12-10",
            startDateTime: "2025-12-10T08:00:00Z",
            endDateTime: "2025-12-10T18:00:00Z", // 8 hours from now
          },
        ],
      };

      const result = hasTripEnded(input);

      expect(result).toBe(false);
    });
  });

  describe("getTimeRemainingFormatted", () => {
    it("should calculate remaining time correctly", () => {
      const input = {
        date: new Date("2025-12-09"),
        startTime: "10:00",
        days: 1,
        timeSlots: [
          {
            day: 1,
            date: "2025-12-09",
            startDateTime: "2025-12-09T10:00:00Z",
            endDateTime: "2025-12-09T14:00:00Z", // 4 hours from now
          },
        ],
      };

      const result = getTimeRemainingFormatted(input);

      expect(result.expired).toBe(false);
      expect(result.hours).toBe(4);
      expect(result.days).toBe(0);
      expect(result.minutes).toBe(0);
    });

    it("should handle expired trips", () => {
      const input = {
        date: new Date("2025-12-09"),
        startTime: "08:00",
        days: 1,
        timeSlots: [
          {
            day: 1,
            date: "2025-12-09",
            startDateTime: "2025-12-09T08:00:00Z",
            endDateTime: "2025-12-09T09:00:00Z", // 1 hour ago
          },
        ],
      };

      const result = getTimeRemainingFormatted(input);

      expect(result.expired).toBe(true);
      expect(result.hours).toBe(1);
    });
  });
});
