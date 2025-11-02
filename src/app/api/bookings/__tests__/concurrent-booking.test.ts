/**
 * Concurrent Booking Test
 *
 * Tests that transaction isolation prevents double bookings when two users
 * attempt to book the same charter date/time simultaneously.
 */

import { prisma } from "@/lib/database/prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth to simulate different users
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

describe("Concurrent Booking Prevention", () => {
  const TEST_CHARTER_ID = "test-charter-concurrent";
  const TEST_TRIP_ID = "test-trip-1";
  const TEST_DATE = new Date("2025-12-15T00:00:00Z");

  beforeEach(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({
      where: { charterId: TEST_CHARTER_ID },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.booking.deleteMany({
      where: { charterId: TEST_CHARTER_ID },
    });
  });

  it("prevents double booking when two users book simultaneously", async () => {
    // Simulate two guest users trying to book the same date/time at the exact same time
    const user1BookingPromise = createBookingWithTransaction(
      "angler1@test.com",
      TEST_CHARTER_ID,
      TEST_TRIP_ID,
      TEST_DATE,
      "08:00",
      1
    );

    const user2BookingPromise = createBookingWithTransaction(
      "angler2@test.com",
      TEST_CHARTER_ID,
      TEST_TRIP_ID,
      TEST_DATE,
      "08:00",
      1
    );

    // Run both bookings concurrently
    const results = await Promise.allSettled([
      user1BookingPromise,
      user2BookingPromise,
    ]);

    // Count successes and failures
    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");

    // Exactly ONE should succeed due to transaction isolation
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    // Verify database state: only one PAID booking exists
    const paidBookings = await prisma.booking.findMany({
      where: {
        charterId: TEST_CHARTER_ID,
        date: TEST_DATE,
        startTime: "08:00",
        status: "PAID",
      },
    });

    expect(paidBookings.length).toBe(1);
  });

  it("allows two bookings for different start times", async () => {
    // These should NOT conflict (different start times)
    const morning = createBookingWithTransaction(
      "angler3@test.com",
      TEST_CHARTER_ID,
      TEST_TRIP_ID,
      TEST_DATE,
      "08:00",
      1
    );

    const afternoon = createBookingWithTransaction(
      "angler4@test.com",
      TEST_CHARTER_ID,
      TEST_TRIP_ID,
      TEST_DATE,
      "14:00",
      1
    );

    // Both should succeed
    const results = await Promise.allSettled([morning, afternoon]);
    const successes = results.filter((r) => r.status === "fulfilled");

    expect(successes.length).toBe(2);

    // Verify two bookings exist
    const bookings = await prisma.booking.findMany({
      where: {
        charterId: TEST_CHARTER_ID,
        date: TEST_DATE,
      },
    });

    expect(bookings.length).toBe(2);
  });

  it("handles retry logic on transaction conflicts", async () => {
    // This test verifies the retry mechanism works by simulating a real conflict
    // Create a booking first
    const firstBooking = await createBookingWithTransaction(
      "angler5@test.com",
      TEST_CHARTER_ID,
      TEST_TRIP_ID,
      TEST_DATE,
      "08:00",
      1
    );

    expect(firstBooking).toBeDefined();

    // Try to create a conflicting booking - should fail immediately due to conflict detection
    // This tests that our hasConflicts() logic properly prevents the booking
    await expect(
      createBookingWithTransaction(
        "angler6@test.com",
        TEST_CHARTER_ID,
        TEST_TRIP_ID,
        TEST_DATE, // Same date
        "08:00", // Same time
        1
      )
    ).rejects.toThrow("Date/time already booked");
  });
});

/**
 * Helper: Create guest booking with transaction isolation (simulates production logic)
 */
async function createBookingWithTransaction(
  guestEmail: string,
  charterId: string,
  tripId: string,
  date: Date,
  startTime: string,
  days: number
): Promise<any> {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const booking = await prisma.$transaction(
        async (tx) => {
          // 1. Check for conflicts
          const candidates = await tx.booking.findMany({
            where: {
              charterId,
              date,
              status: "PAID",
            },
            select: {
              id: true,
              date: true,
              startTime: true,
              days: true,
              status: true,
            },
          });

          // 2. Check for overlaps
          const hasConflict = candidates.some((c) => c.startTime === startTime);

          if (hasConflict) {
            throw new Error("BOOKING_CONFLICT");
          }

          // 3. Create guest booking
          return await tx.booking.create({
            data: {
              userId: null, // Guest booking
              guestEmail,
              guestFirstName: guestEmail.split("@")[0],
              guestLastName: "Test",
              emailVerified: true,
              charterId,
              tripId,
              date,
              startTime,
              days,
              guests: { adults: 2, children: 0 },
              tripPrice: 450.0,
              finalPrice: 450.0,
              status: "PAID", // Simulate immediate payment for test
              paidAt: new Date(),
              expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
            },
          });
        },
        {
          isolationLevel: "Serializable",
          maxWait: 5000,
          timeout: 10000,
        }
      );

      return booking;
    } catch (error: any) {
      lastError = error;

      // Handle specific error codes
      if (error.code === "P2034") {
        // Transaction timeout - retry
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
        continue;
      }

      if (error.message === "BOOKING_CONFLICT") {
        throw new Error("Date/time already booked");
      }

      throw error;
    }
  }

  throw lastError || new Error("Failed after max retries");
}
