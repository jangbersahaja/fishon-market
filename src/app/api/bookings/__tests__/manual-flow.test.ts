import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
  prisma: {
    booking: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/services/trip-service", () => ({
  getTripById: vi.fn(),
}));

vi.mock("@/lib/services/charter-service", () => ({
  getCharterById: vi.fn(),
  getCharterFlowType: vi.fn(),
  getCharterApprovalTimeHours: vi.fn(),
}));

vi.mock("@/lib/payment/payment-gateway", () => ({
  createPaymentIntent: vi.fn(),
  getPaymentFlow: vi.fn(),
}));

vi.mock("@/lib/services/email-service", () => ({
  sendBookingCreatedEmail: vi.fn(),
  sendBookingReceivedCaptainEmail: vi.fn(),
}));

vi.mock("@/lib/services/notification-service", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "notif-1" }),
}));

vi.mock("@/lib/services/message-service", () => ({
  createConversation: vi.fn().mockResolvedValue({ id: "conv-1" }),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  unlockConversation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/webhooks/webhook", () => ({
  sendWithRetry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/analytics-service", () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import {
  createPaymentIntent,
  getPaymentFlow,
} from "@/lib/payment/payment-gateway";
import {
  getCharterApprovalTimeHours,
  getCharterById,
  getCharterFlowType,
} from "@/lib/services/charter-service";
import { getTripById } from "@/lib/services/trip-service";
import { sendWithRetry } from "@/lib/webhooks/webhook";
import { POST as createGuestBooking } from "../create-guest/route";
import { POST as createBooking } from "../create/route";

function req(body: any) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Manual booking flow", () => {
  const originalEnv = { ...process.env };
  let txCreateSpy: ReturnType<typeof vi.fn>;
  let lastCreateArgs: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      CAPTAIN_WEBHOOK_URL: "https://captain.example/webhooks",
      CAPTAIN_API_SECRET: "secret",
      NEXT_PUBLIC_BASE_URL: "https://fishon.test",
    };

    (auth as any).mockResolvedValue({
      user: { id: "user-1", email: "angler@test.com", name: "Angler" },
    });

    (getTripById as any).mockResolvedValue({
      id: "trip-1",
      name: "Sunset Trip",
      durationHours: 6,
      price: 900,
      startTimes: ["07:00"],
      charter: {
        id: "charter-1",
        name: "Captain Zee",
        startingPoint: "Marina",
        captain: {
          id: "captain-1",
          email: "captain@test.com",
          displayName: "Captain Zee",
        },
      },
    });

    (getCharterById as any).mockResolvedValue({
      id: "charter-1",
      name: "Captain Zee",
      schedule: null,
      unavailability: [],
      ownerId: "owner-1",
    });

    (getCharterFlowType as any).mockResolvedValue("MANUAL");
    (getCharterApprovalTimeHours as any).mockResolvedValue(36);

    (prisma.booking.count as any).mockResolvedValue(0);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-1",
      email: "angler@test.com",
      name: "Angler",
      phone: "+60123456789",
    });
    (prisma.user.update as any).mockResolvedValue({});
    (prisma.user.create as any).mockResolvedValue({
      id: "user-1",
      email: "angler@test.com",
    });

    txCreateSpy = vi.fn(async (args: any) => {
      lastCreateArgs = args;
      return {
        id: "booking-1",
        ...args.data,
        user: {
          id: "user-1",
          email: "angler@test.com",
          name: "Angler",
        },
      };
    });

    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        booking: {
          findMany: vi.fn().mockResolvedValue([]),
          create: txCreateSpy,
        },
      };
      return cb(tx);
    });
  });

  function extractCreateData() {
    return lastCreateArgs?.data;
  }

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("initializes authenticated manual bookings as pending without payment", async () => {
    const response = await createBooking(
      req({
        tripId: "trip-1",
        date: "2025-12-10",
        days: 1,
        adults: 2,
        children: 0,
        startTime: "07:00",
      })
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.booking.status).toBe("PENDING");
    expect(payload.booking.bookingFlowType).toBe("MANUAL");
    expect(payload.booking.approvalDeadline).toBeTruthy();

    const createData = extractCreateData();
    expect(createData.status).toBe("PENDING");
    expect(createData.bookingFlowType).toBe("MANUAL");
    expect(createData.paymentMethod).toBeNull();
    expect(createData.paymentFlow).toBeNull();
    expect(createData.paymentIntentId).toBeNull();
    expect(createData.approvalDeadline).toBeInstanceOf(Date);
    expect(createData.expiresAt).toBeInstanceOf(Date);

    const approvalMs = createData.approvalDeadline.getTime();
    const expectedMs = Date.now() + 36 * 60 * 60 * 1000;
    expect(Math.abs(approvalMs - expectedMs)).toBeLessThan(3000);
    expect(createData.expiresAt.getTime()).toBe(approvalMs);

    expect(createPaymentIntent).not.toHaveBeenCalled();
    expect(getPaymentFlow).not.toHaveBeenCalled();
    expect(sendWithRetry).toHaveBeenCalled();
  });

  it("initializes guest manual bookings as pending without payment", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: "guest-1",
      email: "guest@test.com",
      role: "GUEST",
      emailVerified: new Date(),
    });

    const response = await createGuestBooking(
      req({
        verifiedEmail: "guest@test.com",
        verifiedUserId: "guest-1",
        firstName: "Guest",
        lastName: "Angler",
        phone: "+6011223344",
        tripId: "trip-1",
        date: "2025-12-12",
        days: 2,
        adults: 2,
        children: 0,
        startTime: "07:00",
      })
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.booking.status).toBe("PENDING");
    expect(payload.booking.bookingFlowType).toBe("MANUAL");

    const createData = extractCreateData();
    expect(createData.status).toBe("PENDING");
    expect(createData.paymentMethod).toBeNull();
    expect(createData.paymentFlow).toBeNull();
    expect(createData.paymentIntentId).toBeNull();
    expect(createData.approvalDeadline).toBeInstanceOf(Date);
    expect(createData.expiresAt.getTime()).toBe(
      createData.approvalDeadline.getTime()
    );

    expect(createPaymentIntent).not.toHaveBeenCalled();
    expect(getPaymentFlow).not.toHaveBeenCalled();
    expect(sendWithRetry).toHaveBeenCalled();
  });
});
