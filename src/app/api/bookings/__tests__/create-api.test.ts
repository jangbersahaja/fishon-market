import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/database/prisma", () => {
  return {
    prisma: {
      booking: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "u1", email: "test@test.com" }),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/services/trip-service", () => ({
  getTripById: vi.fn(),
  calculateFinalPrice: vi.fn((opts: any) => opts.tripPrice * opts.days),
}));
vi.mock("@/lib/services/charter-service", () => ({
  getCharterById: vi.fn(),
}));
vi.mock("@/lib/services/email-service", () => ({
  sendBookingCreatedEmail: vi.fn(),
  sendBookingReceivedCaptainEmail: vi.fn(),
}));
vi.mock("@/lib/services/notification-service", () => ({
  createNotification: vi.fn(),
}));
vi.mock("@/lib/webhooks/webhook", () => ({
  sendWithRetry: vi.fn(),
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { getCharterById } from "@/lib/services/charter-service";
import { getTripById } from "@/lib/services/trip-service";
import { POST as createBooking } from "../create/route";

function req(body: any) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/bookings/create", () => {
  it("requires auth", async () => {
    (auth as any).mockResolvedValue(null);
    const res = await createBooking(req({}));
    expect(res.status).toBe(400); // Returns 400 for guest bookings requiring verification
  });

  it("requires startTime when trip defines startTimes", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (getTripById as any).mockResolvedValue({
      id: "trip-1",
      name: "Trip A",
      price: 100,
      startTimes: ["07:00", "13:00"],
      charter: {
        id: "c1",
        name: "Charter",
        location: "Klang",
      },
    });
    const res = await createBooking(
      req({
        tripId: "trip-1",
        date: "2025-11-01",
        days: 1,
        adults: 2,
      })
    );
    expect(res.status).toBe(400);
  });

  it("creates booking when valid and no conflict", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (getTripById as any).mockResolvedValue({
      id: "trip-1",
      name: "Trip A",
      price: 100,
      startTimes: ["07:00", "13:00"],
      charter: {
        id: "c1",
        name: "Charter",
        location: "Klang",
      },
    });
    (getCharterById as any).mockResolvedValue({
      id: "c1",
      name: "Charter",
      schedule: null, // No schedule restrictions for this test
      unavailability: [],
    });
    (prisma.booking.findMany as any).mockResolvedValue([]);
    (prisma.booking.create as any).mockResolvedValue({ id: "b1" });

    // Mock transaction to execute callback and return the created booking
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      return callback({
        booking: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: "b1" }),
        },
      });
    });

    const res = await createBooking(
      req({
        tripId: "trip-1",
        date: "2025-11-01",
        days: 2,
        adults: 2,
        startTime: "07:00",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.booking.id).toBe("b1");
  });

  it("returns 409 on conflict (same time)", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (getTripById as any).mockResolvedValue({
      id: "trip-1",
      name: "Trip A",
      price: 100,
      startTimes: ["07:00", "13:00"],
      charter: {
        id: "c1",
        name: "Charter",
        location: "Klang",
      },
    });
    (getCharterById as any).mockResolvedValue({
      id: "c1",
      name: "Charter",
      schedule: null,
      unavailability: [],
    });
    (prisma.booking.findMany as any).mockResolvedValue([
      {
        id: "b0",
        date: new Date("2025-11-01T00:00:00Z"),
        days: 1,
        startTime: "07:00",
        status: "PAID",
      },
    ]);

    // Mock transaction - should detect conflict
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      return callback({
        booking: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "b0",
              date: new Date("2025-11-01T00:00:00Z"),
              days: 1,
              startTime: "07:00",
              status: "PAID",
            },
          ]),
        },
      });
    });

    const res = await createBooking(
      req({
        tripId: "trip-1",
        date: "2025-11-01",
        days: 1,
        adults: 2,
        startTime: "07:00",
      })
    );
    expect(res.status).toBe(409);
  });
});
