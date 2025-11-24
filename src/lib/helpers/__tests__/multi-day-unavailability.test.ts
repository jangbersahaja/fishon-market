/**
 * Test: Multi-day time-based unavailability
 *
 * Scenario: Captain sets unavailability from 31 Dec 8pm to 1 Jan 12pm
 * Expected:
 * - 31 Dec: Partial availability (20:00-23:59 blocked)
 * - 1 Jan: Partial availability (00:00-12:00 blocked)
 * - Neither date should be fully blocked
 */

import { describe, expect, it } from "vitest";
import {
  calculateBlockedDates,
  calculatePartialAvailability,
} from "../availability-helpers";

describe("Multi-day time-based unavailability", () => {
  const startDate = new Date("2025-12-01");
  const endDate = new Date("2026-01-31");

  it("should NOT fully block dates with time-based unavailability", () => {
    const unavailability = [
      {
        startDate: "2025-12-31",
        endDate: "2026-01-01",
        reason: "New Year Holiday",
        isAllDay: false,
        startTime: "20:00",
        endTime: "12:00",
      },
    ];

    const blockedDates = calculateBlockedDates(
      null, // No schedule restrictions
      unavailability,
      null, // No bookings
      startDate,
      endDate
    );

    // Neither date should be fully blocked
    expect(blockedDates.has("2025-12-31")).toBe(false);
    expect(blockedDates.has("2026-01-01")).toBe(false);
  });

  it("should create partial availability for edge days correctly", () => {
    const unavailability = [
      {
        startDate: "2025-12-31",
        endDate: "2026-01-01",
        reason: "New Year Holiday",
        isAllDay: false,
        startTime: "20:00", // 8pm
        endTime: "12:00", // noon next day
      },
    ];

    const partialAvailability = calculatePartialAvailability(
      unavailability,
      null, // No bookings
      startDate,
      endDate
    );

    // Both dates should have partial availability
    expect(partialAvailability.has("2025-12-31")).toBe(true);
    expect(partialAvailability.has("2026-01-01")).toBe(true);

    // 31 Dec: Evening blocked (20:00 to 23:59)
    const dec31 = partialAvailability.get("2025-12-31");
    expect(dec31?.unavailableTimeRanges).toEqual([
      { startTime: "20:00", endTime: "23:59" },
    ]);

    // 1 Jan: Morning blocked (00:00 to 12:00)
    const jan01 = partialAvailability.get("2026-01-01");
    expect(jan01?.unavailableTimeRanges).toEqual([
      { startTime: "00:00", endTime: "12:00" },
    ]);
  });

  it("should handle 3-day unavailability with middle day fully blocked", () => {
    const unavailability = [
      {
        startDate: "2025-12-30",
        endDate: "2026-01-01",
        reason: "Extended Holiday",
        isAllDay: false,
        startTime: "20:00", // 8pm on 30th
        endTime: "12:00", // noon on 1st
      },
    ];

    const partialAvailability = calculatePartialAvailability(
      unavailability,
      null,
      startDate,
      endDate
    );

    // All three dates should have partial availability
    expect(partialAvailability.has("2025-12-30")).toBe(true);
    expect(partialAvailability.has("2025-12-31")).toBe(true);
    expect(partialAvailability.has("2026-01-01")).toBe(true);

    // 30 Dec: Evening blocked (20:00 to 23:59)
    const dec30 = partialAvailability.get("2025-12-30");
    expect(dec30?.unavailableTimeRanges).toEqual([
      { startTime: "20:00", endTime: "23:59" },
    ]);

    // 31 Dec: Entire day blocked (00:00 to 23:59)
    const dec31 = partialAvailability.get("2025-12-31");
    expect(dec31?.unavailableTimeRanges).toEqual([
      { startTime: "00:00", endTime: "23:59" },
    ]);

    // 1 Jan: Morning blocked (00:00 to 12:00)
    const jan01 = partialAvailability.get("2026-01-01");
    expect(jan01?.unavailableTimeRanges).toEqual([
      { startTime: "00:00", endTime: "12:00" },
    ]);
  });

  it("should handle single-day time-based unavailability", () => {
    const unavailability = [
      {
        startDate: "2025-12-25",
        endDate: "2025-12-25",
        reason: "Morning maintenance",
        isAllDay: false,
        startTime: "08:00",
        endTime: "12:00",
      },
    ];

    const partialAvailability = calculatePartialAvailability(
      unavailability,
      null,
      startDate,
      endDate
    );

    expect(partialAvailability.has("2025-12-25")).toBe(true);

    const dec25 = partialAvailability.get("2025-12-25");
    expect(dec25?.unavailableTimeRanges).toEqual([
      { startTime: "08:00", endTime: "12:00" },
    ]);
  });
});
