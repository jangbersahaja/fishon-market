import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/database/prisma", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/payment/payment-gateway", () => ({
  capturePayment: vi.fn(),
}));
vi.mock("@/lib/services/email-service", () => ({
  sendBookingApprovedEmail: vi.fn(),
}));
vi.mock("@/lib/services/notification-service", () => ({
  createNotification: vi.fn(),
}));
vi.mock("@/lib/webhooks/webhook", () => ({
  sendWithRetry: vi.fn(),
}));
vi.mock("@/lib/analytics-service", () => ({
  trackEvent: vi.fn(),
}));
vi.mock("@/lib/services/trip-service", () => ({
  getTripById: vi.fn(),
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { capturePayment } from "@/lib/payment/payment-gateway";
import { POST as approve } from "../approve/route";

function createRequest(body: any, headers?: Record<string, string>) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json", ...(headers || {}) },
    body: JSON.stringify(body),
  });
}

const mockBookingBase = {
  id: "booking-123",
  userId: "user-123",
  charterId: "charter-123",
  tripId: "trip-123",
  finalPrice: 300.0,
  expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
  process.env.CAPTAIN_API_SECRET = "test-secret";
  (auth as any).mockResolvedValue({ user: { id: "staff-1", role: "STAFF" } });
});

describe("POST /api/bookings/approve - Dual Flow System", () => {
  describe("Authorization", () => {
    it("allows approval with captain API secret", async () => {
      (prisma.booking.findUnique as any).mockResolvedValue({
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "DIRECT",
        paymentTransactionId: "txn-123",
        paymentCapturedAt: new Date(),
      });

      (prisma.booking.update as any).mockResolvedValue({
        ...mockBookingBase,
        status: "PAID",
      });

      const res = await approve(
        createRequest(
          { id: "booking-123" },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(200);
    });

    it("allows approval with STAFF role", async () => {
      (prisma.booking.findUnique as any).mockResolvedValue({
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "DIRECT",
        paymentTransactionId: "txn-123",
        paymentCapturedAt: new Date(),
      });

      (prisma.booking.update as any).mockResolvedValue({
        ...mockBookingBase,
        status: "PAID",
      });

      const res = await approve(createRequest({ id: "booking-123" }));
      expect(res.status).toBe(200);
    });

    it("rejects unauthorized users", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "user-1", role: "ANGLER" },
      });

      const res = await approve(createRequest({ id: "booking-123" }));
      expect(res.status).toBe(401);
    });
  });

  describe("TOKENIZED Flow (Card Payments)", () => {
    it("successfully captures card payment", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "TOKENIZED",
        paymentMethod: "CARD",
        paymentIntentId: "token-123",
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (capturePayment as any).mockResolvedValue({
        success: true,
        transactionId: "captured-txn-123",
      });

      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "PAID",
        paymentCapturedAt: expect.any(Date),
        paymentTransactionId: "captured-txn-123",
      });

      const res = await approve(
        createRequest(
          { id: "booking-123" },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(200);
      expect(capturePayment).toHaveBeenCalledWith(
        "token-123",
        300.0,
        "booking-123"
      );
      const updateCall = (prisma.booking.update as any).mock.calls[0][0];
      expect(updateCall.where.id).toBe("booking-123");
      expect(updateCall.data.status).toBe("PAID");
      expect(updateCall.data.paymentCapturedAt).toBeInstanceOf(Date);
      expect(updateCall.data.paymentTransactionId).toBe("captured-txn-123");
    });

    it("handles card capture failure", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "TOKENIZED",
        paymentMethod: "CARD",
        paymentIntentId: "token-123",
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (capturePayment as any).mockResolvedValue({
        success: false,
        error: "Card declined",
      });

      const res = await approve(
        createRequest(
          { id: "booking-123" },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(402); // Payment Required
      const data = await res.json();
      expect(data.error).toContain("Payment failed: Card declined");
      expect(data.captureError).toBe(true);
    });

    it("handles missing payment token", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "TOKENIZED",
        paymentMethod: "CARD",
        paymentIntentId: null, // Missing token
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);

      const res = await approve(
        createRequest(
          { id: "booking-123" },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Payment token missing");
    });

    it("simulates MOCK payment capture", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "MOCK",
        paymentMethod: "MOCK",
        paymentIntentId: "mock-token-123",
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "PAID",
      });

      const res = await approve(
        createRequest(
          { id: "booking-123" },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(200);
      expect(capturePayment).not.toHaveBeenCalled(); // Mock doesn't call real gateway
      const updateCall = (prisma.booking.update as any).mock.calls[0][0];
      expect(updateCall.where.id).toBe("booking-123");
      expect(updateCall.data.status).toBe("PAID");
      expect(updateCall.data.paymentCapturedAt).toBeInstanceOf(Date);
      expect(updateCall.data.paymentTransactionId).toMatch(/^mock-txn-/);
    });
  });

  describe("DIRECT Flow (FPX/E-wallet Payments)", () => {
    it("confirms booking for already captured DIRECT payment", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "DIRECT",
        paymentMethod: "FPX",
        paymentTransactionId: "fpx-txn-123",
        paymentCapturedAt: new Date(),
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "PAID",
      });

      const res = await approve(
        createRequest(
          { id: "booking-123" },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(200);
      expect(capturePayment).not.toHaveBeenCalled(); // No capture needed
      const updateCall = (prisma.booking.update as any).mock.calls[0][0];
      expect(updateCall.where.id).toBe("booking-123");
      expect(updateCall.data.status).toBe("PAID");
      expect(updateCall.data.captainDecisionAt).toBeInstanceOf(Date);
    });

    it("rejects DIRECT flow without captured payment", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "DIRECT",
        paymentMethod: "FPX",
        paymentTransactionId: null, // No transaction ID
        paymentCapturedAt: null, // No capture time
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);

      const res = await approve(
        createRequest(
          { id: "booking-123" },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Payment not yet received");
    });
  });

  describe("Legacy PENDING Status", () => {
    it("approves legacy PENDING booking to APPROVED status", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PENDING",
        paymentFlow: null,
        paymentMethod: null,
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "APPROVED",
      });

      const res = await approve(
        createRequest(
          { id: "booking-123" },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(200);
      const updateCall = (prisma.booking.update as any).mock.calls[0][0];
      expect(updateCall.where.id).toBe("booking-123");
      expect(updateCall.data.status).toBe("APPROVED");
      expect(updateCall.data.captainDecisionAt).toBeInstanceOf(Date);
    });
  });

  describe("Edge Cases", () => {
    it("rejects expired bookings", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);

      const res = await approve(
        createRequest(
          { id: "booking-123" },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("Booking expired");
    });

    it("rejects non-pending bookings", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAID", // Already processed
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);

      const res = await approve(
        createRequest(
          { id: "booking-123" },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("Only pending or payment-pending bookings");
    });

    it("returns 404 for non-existent booking", async () => {
      (prisma.booking.findUnique as any).mockResolvedValue(null);

      const res = await approve(
        createRequest(
          { id: "non-existent" },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(404);
    });

    it("returns 400 for missing booking ID", async () => {
      const res = await approve(
        createRequest(
          {}, // No ID
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("id required");
    });
  });
});
