import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuth,
  mockTrip,
  mockCharterService,
  mockCreatePaymentIntent,
  mockGetPaymentFlow,
  mockSendBookingCreatedEmail,
  mockSendBookingReceivedCaptainEmail,
  mockCreateNotification,
  mockSendWithRetry,
  mockCreateConversation,
  mockSendMessage,
  mockUnlockConversation,
  bookingFindMany,
  bookingCreate,
  bookingCount,
  bookingFindUnique,
  bookingUpdate,
  userFindUnique,
  userUpdate,
  userCreate,
} = vi.hoisted(() => {
  return {
    mockAuth: vi.fn(),
    mockTrip: {
      id: "trip-1",
      name: "Sunrise Trip",
      durationHours: 6,
      price: 900,
      startTimes: ["07:00"],
      charter: {
        id: "charter-1",
        name: "Captain Zee",
        startingPoint: "Marina",
        captain: { id: "captain-1", email: "cap@test.com", displayName: "Captain Zee" },
      },
    },
    mockCharterService: {
      getCharterById: vi.fn(),
      getCharterFlowType: vi.fn(),
      getCharterApprovalTimeHours: vi.fn(),
    },
    mockCreatePaymentIntent: vi.fn(),
    mockGetPaymentFlow: vi.fn((method: string) => (method === "CARD" ? "TOKENIZED" : "DIRECT")),
    mockSendBookingCreatedEmail: vi.fn(),
    mockSendBookingReceivedCaptainEmail: vi.fn(),
    mockCreateNotification: vi.fn().mockResolvedValue({ id: "notif-1" }),
    mockSendWithRetry: vi.fn(),
    mockCreateConversation: vi.fn().mockResolvedValue({ id: "conv-1" }),
    mockSendMessage: vi.fn().mockResolvedValue(undefined),
    mockUnlockConversation: vi.fn().mockResolvedValue(undefined),
    bookingFindMany: vi.fn(),
    bookingCreate: vi.fn(),
    bookingCount: vi.fn(),
    bookingFindUnique: vi.fn(),
    bookingUpdate: vi.fn(),
    userFindUnique: vi.fn(),
    userUpdate: vi.fn(),
    userCreate: vi.fn(),
  };
});

vi.mock("@/lib/auth/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/database/prisma", () => ({
  prisma: {
    booking: {
      findMany: bookingFindMany,
      create: bookingCreate,
      count: bookingCount,
      findUnique: bookingFindUnique,
      update: bookingUpdate,
    },
    user: {
      findUnique: userFindUnique,
      update: userUpdate,
      create: userCreate,
    },
    $transaction: vi.fn(async (cb: any) => {
      const tx = {
        booking: {
          findMany: bookingFindMany,
          create: bookingCreate,
        },
      };
      return cb(tx);
    }),
  },
}));

vi.mock("@/lib/services/trip-service", () => ({
  getTripById: vi.fn(),
}));

vi.mock("@/lib/services/charter-service", () => mockCharterService);

vi.mock("@/lib/payment/payment-gateway", () => ({
  createPaymentIntent: mockCreatePaymentIntent,
  getPaymentFlow: mockGetPaymentFlow,
}));

vi.mock("@/lib/services/email-service", () => ({
  sendBookingCreatedEmail: mockSendBookingCreatedEmail,
  sendBookingReceivedCaptainEmail: mockSendBookingReceivedCaptainEmail,
}));

vi.mock("@/lib/services/notification-service", () => ({
  createNotification: mockCreateNotification,
}));

vi.mock("@/lib/services/message-service", () => ({
  createConversation: mockCreateConversation,
  sendMessage: mockSendMessage,
  unlockConversation: mockUnlockConversation,
}));

vi.mock("@/lib/webhooks/webhook", () => ({
  sendWithRetry: mockSendWithRetry,
}));

vi.mock("@/lib/analytics-service", () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/payment/payment-side-effects", () => ({
  triggerPaymentSideEffects: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/database/prisma-captain", () => ({
  prismaCaptain: {
    charter: {
      findUnique: vi.fn().mockResolvedValue({ pricingPlan: "BASIC" }),
    },
  },
}));

import { prisma } from "@/lib/database/prisma";
import { getTripById } from "@/lib/services/trip-service";
import { POST as createBooking } from "../create/route";
import { POST as createGuestBooking } from "../create-guest/route";
import { POST as senangPayCallback } from "@/app/api/payment/senangpay-callback/route";
import { NextRequest } from "next/server";

function jsonReq(body: any) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("AUTO booking flow", () => {
  const originalEnv = { ...process.env };
  let lastCreateData: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      CAPTAIN_WEBHOOK_URL: "https://captain/webhook",
      CAPTAIN_API_SECRET: "secret",
      NEXT_PUBLIC_BASE_URL: "https://fishon.example",
      SENANGPAY_MERCHANT_ID: "merchant-1",
      SENANGPAY_SECRET_KEY: "secret-key",
      SENANGPAY_MODE: "sandbox",
    };

    mockAuth.mockResolvedValue({ user: { id: "user-1", email: "angler@test.com", name: "Angler" } });
    (getTripById as any).mockResolvedValue({ ...mockTrip });
    mockCharterService.getCharterFlowType.mockResolvedValue("AUTO");
    mockCharterService.getCharterById.mockResolvedValue({ id: "charter-1", ownerId: "owner-1" });
    mockCreatePaymentIntent.mockReset();
    mockCreatePaymentIntent.mockResolvedValue({
      success: true,
      flow: "TOKENIZED",
      paymentIntentId: "token-123",
      paymentMethod: "CARD",
      amount: 900,
      requiresRedirect: false,
    });

    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-1",
      email: "angler@test.com",
      name: "Angler",
      phone: "+60123456789",
    });
    (prisma.user.update as any).mockResolvedValue({});
    (prisma.user.create as any).mockResolvedValue({ id: "user-1" });
    (prisma.booking.findMany as any).mockResolvedValue([]);
    (prisma.booking.create as any).mockImplementation(async (args: any) => {
      lastCreateData = args.data;
      return {
        id: "booking-1",
        ...args.data,
        date: args.data.date,
        user: { id: "user-1", email: "angler@test.com", name: "Angler" },
      };
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("tokenizes card payments and stores payment metadata", async () => {
    const response = await createBooking(
      jsonReq({
        tripId: "trip-1",
        date: "2025-12-12",
        days: 1,
        adults: 2,
        children: 0,
        startTime: "07:00",
        paymentMethod: "CARD",
        cardNumber: "4111 1111 1111 1111",
        cardExpMonth: "12",
        cardExpYear: "26",
        cardCvv: "123",
      })
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.booking.status).toBe("PAYMENT_AUTHORIZED");
    expect(payload.booking.paymentMethod).toBe("CARD");
    expect(payload.booking.paymentFlow).toBe("TOKENIZED");
    expect(lastCreateData.paymentIntentId).toBe("token-123");
    expect(mockCreatePaymentIntent).toHaveBeenCalledTimes(1);
  });

  it("returns redirect url for FPX/E-Wallet option", async () => {
    mockCreatePaymentIntent.mockReset();
    mockCreatePaymentIntent.mockResolvedValue({
      success: true,
      flow: "DIRECT",
      paymentIntentId: "booking-1",
      paymentMethod: "FPX",
      amount: 900,
      requiresRedirect: true,
      redirectUrl: "https://pay.example/redirect",
    });

    const response = await createBooking(
      jsonReq({
        tripId: "trip-1",
        date: "2025-12-12",
        days: 1,
        adults: 2,
        children: 0,
        startTime: "07:00",
        paymentMethod: "FPX",
      })
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.requiresRedirect).toBe(true);
    expect(payload.redirectUrl).toBe("https://pay.example/redirect");
  });

  it("rejects mock payments unless SENANGPAY_FORCE_MOCK is enabled", async () => {
    delete process.env.SENANGPAY_FORCE_MOCK;

    const denied = await createBooking(
      jsonReq({
        tripId: "trip-1",
        date: "2025-12-12",
        days: 1,
        adults: 2,
        children: 0,
        startTime: "07:00",
        paymentMethod: "MOCK",
      })
    );

    expect(denied.status).toBe(400);

    process.env.SENANGPAY_FORCE_MOCK = "true";
    const allowed = await createBooking(
      jsonReq({
        tripId: "trip-1",
        date: "2025-12-12",
        days: 1,
        adults: 2,
        children: 0,
        startTime: "07:00",
        paymentMethod: "MOCK",
      })
    );

    expect(allowed.status).toBe(201);
    const payload = await allowed.json();
    expect(payload.booking.status).toBe("PAYMENT_AUTHORIZED");
  });

  it("creates guest AUTO bookings with payment metadata", async () => {
    (prisma.booking.count as any).mockResolvedValue(0);
    (prisma.user.findUnique as any).mockResolvedValueOnce({
      id: "guest-1",
      email: "guest@test.com",
      role: "GUEST",
      emailVerified: new Date(),
    });

    const response = await createGuestBooking(
      jsonReq({
        verifiedEmail: "guest@test.com",
        verifiedUserId: "guest-1",
        firstName: "Guest",
        lastName: "User",
        phone: "+60111222333",
        tripId: "trip-1",
        date: "2025-12-13",
        days: 1,
        adults: 2,
        children: 0,
        startTime: "07:00",
        paymentMethod: "CARD",
        cardNumber: "4111 1111 1111 1111",
        cardExpMonth: "11",
        cardExpYear: "27",
        cardCvv: "123",
      })
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.booking.status).toBe("PAYMENT_AUTHORIZED");
    expect(payload.booking.paymentIntentId).toBe("token-123");
    expect(mockCreatePaymentIntent).toHaveBeenCalled();
  });
});

describe("SenangPay callback", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      SENANGPAY_MERCHANT_ID: "merchant-1",
      SENANGPAY_SECRET_KEY: "secret-key",
    };
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: "booking-1",
      status: "PAYMENT_AUTHORIZED",
      paidAt: null,
      paymentTransactionId: null,
      userId: "user-1",
      tripId: "trip-1",
      charterId: "charter-1",
      date: new Date(),
      finalPrice: 900,
      user: { name: "Angler" },
    });
    (prisma.booking.update as any).mockResolvedValue({ status: "PAID" });
    mockCharterService.getCharterById.mockResolvedValue({ id: "charter-1", ownerId: "owner-1" });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("marks booking as PAID when callback status is success", async () => {
    const formData = new FormData();
    formData.append("status_id", "1");
    formData.append("order_id", "booking-1");
    formData.append("transaction_id", "txn-123");
    formData.append("msg", "Payment successful");
    formData.append("hash", "valid-hash");

    const senangpayModule = await import("@/lib/payment/senangpay");
    const verifyReturnHash = vi
      .spyOn(senangpayModule, "verifyReturnHash")
      .mockReturnValue(true);

    const request = new NextRequest("http://localhost/api/payment/senangpay-callback", {
      method: "POST",
      body: formData,
    });
    const response = await senangPayCallback(request);

    expect(response.status).toBe(200);
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "booking-1" },
        data: expect.objectContaining({ status: "PAID" }),
      })
    );
    verifyReturnHash.mockRestore();
  });
});
