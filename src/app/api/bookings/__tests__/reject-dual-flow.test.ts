import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/database/prisma", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/payment/payment-gateway", () => ({
  releasePayment: vi.fn(),
}));
vi.mock("@/lib/services/refund-service", () => ({
  initiateRefund: vi.fn(),
}));
vi.mock("@/lib/services/email-service", () => ({
  sendBookingRejectedEmail: vi.fn(),
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

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { releasePayment } from "@/lib/payment/payment-gateway";
import { initiateRefund } from "@/lib/services/refund-service";
import { POST as reject } from "../reject/route";

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
  expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
  process.env.CAPTAIN_API_SECRET = "test-secret";
  (auth as any).mockResolvedValue({ user: { id: "staff-1", role: "STAFF" } });
});

describe("POST /api/bookings/reject - Dual Flow System", () => {
  describe("TOKENIZED Flow (Card Payments)", () => {
    it("successfully releases card authorization", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "TOKENIZED",
        paymentMethod: "CARD",
        paymentIntentId: "token-123",
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (releasePayment as any).mockResolvedValue({
        success: true,
        message: "Authorization released",
      });

      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "REJECTED",
        rejectionReason: "Not available",
      });

      const res = await reject(
        createRequest(
          {
            id: "booking-123",
            reason: "Not available",
          },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(200);
      expect(releasePayment).toHaveBeenCalledWith("token-123", "booking-123");
      expect(initiateRefund).not.toHaveBeenCalled(); // No refund for TOKENIZED

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: "booking-123" },
        data: expect.objectContaining({
          status: "REJECTED",
          rejectionReason: "Not available",
          paymentReleasedAt: expect.any(Date),
          captainDecisionAt: expect.any(Date),
        }),
      });
    });

    it("handles release payment failure", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "TOKENIZED",
        paymentMethod: "CARD",
        paymentIntentId: "token-123",
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (releasePayment as any).mockResolvedValue({
        success: false,
        error: "Token not found",
      });

      const res = await reject(
        createRequest(
          {
            id: "booking-123",
            reason: "Not available",
          },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain("Failed to release payment");
      expect(data.releaseError).toBe(true);
    });

    it("simulates MOCK payment release", async () => {
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
        status: "REJECTED",
      });

      const res = await reject(
        createRequest(
          {
            id: "booking-123",
            reason: "Test rejection",
          },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(200);
      expect(releasePayment).not.toHaveBeenCalled(); // Mock doesn't call real gateway
      expect(initiateRefund).not.toHaveBeenCalled();
    });
  });

  describe("DIRECT Flow (FPX/E-wallet Payments)", () => {
    it("initiates full refund for DIRECT payments", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "DIRECT",
        paymentMethod: "FPX",
        paymentTransactionId: "fpx-txn-123",
        paymentCapturedAt: new Date(),
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (initiateRefund as any).mockResolvedValue({
        success: true,
        refundTransactionId: "refund-123",
        refundAmount: 300.0,
      });

      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "REJECTED",
        rejectionReason: "Unavailable",
      });

      const res = await reject(
        createRequest(
          {
            id: "booking-123",
            reason: "Unavailable",
          },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(200);
      expect(releasePayment).not.toHaveBeenCalled(); // No release for DIRECT
      expect(initiateRefund).toHaveBeenCalledWith(
        "booking-123",
        300.0, // Full amount
        "FULL" // Full refund type
      );

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: "booking-123" },
        data: expect.objectContaining({
          status: "REJECTED",
          rejectionReason: "Unavailable",
          refundStatus: "PROCESSING",
          refundTransactionId: "refund-123",
          captainDecisionAt: expect.any(Date),
        }),
      });
    });

    it("handles refund initiation failure", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "DIRECT",
        paymentMethod: "EWALLET",
        paymentTransactionId: "ewallet-txn-123",
        paymentCapturedAt: new Date(),
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (initiateRefund as any).mockResolvedValue({
        success: false,
        error: "Refund service unavailable",
      });

      const res = await reject(
        createRequest(
          {
            id: "booking-123",
            reason: "Schedule conflict",
          },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain("Failed to process refund");
      expect(data.refundError).toBe(true);
    });
  });

  describe("Legacy PENDING Status", () => {
    it("rejects legacy PENDING booking without payment processing", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PENDING",
        paymentFlow: null,
        paymentMethod: null,
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "REJECTED",
        rejectionReason: "Calendar full",
      });

      const res = await reject(
        createRequest(
          {
            id: "booking-123",
            reason: "Calendar full",
          },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(200);
      expect(releasePayment).not.toHaveBeenCalled();
      expect(initiateRefund).not.toHaveBeenCalled();

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: "booking-123" },
        data: expect.objectContaining({
          status: "REJECTED",
          rejectionReason: "Calendar full",
          captainDecisionAt: expect.any(Date),
        }),
      });
    });
  });

  describe("Edge Cases", () => {
    it("rejects already processed bookings", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAID", // Already approved
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);

      const res = await reject(
        createRequest(
          {
            id: "booking-123",
            reason: "Test",
          },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("Only pending bookings can be rejected");
    });

    it("requires rejection reason", async () => {
      const res = await reject(
        createRequest(
          {
            id: "booking-123",
            // Missing reason
          },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("id and reason required");
    });

    it("handles missing payment token for TOKENIZED flow", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "TOKENIZED",
        paymentMethod: "CARD",
        paymentIntentId: null, // Missing token
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);

      const res = await reject(
        createRequest(
          {
            id: "booking-123",
            reason: "Test",
          },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Payment token missing");
    });

    it("returns 404 for non-existent booking", async () => {
      (prisma.booking.findUnique as any).mockResolvedValue(null);

      const res = await reject(
        createRequest(
          {
            id: "non-existent",
            reason: "Test",
          },
          { "x-captain-api-secret": "test-secret" }
        )
      );

      expect(res.status).toBe(404);
    });
  });
});
