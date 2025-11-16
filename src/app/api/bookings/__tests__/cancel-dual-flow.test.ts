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
  calculateRefundAmount: vi.fn(),
  initiateRefund: vi.fn(),
}));
vi.mock("@/lib/services/email-service", () => ({
  sendBookingCancelledEmail: vi.fn(),
}));
vi.mock("@/lib/services/notification-service", () => ({
  createNotification: vi.fn(),
}));
vi.mock("@/lib/analytics-service", () => ({
  trackEvent: vi.fn(),
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { releasePayment } from "@/lib/payment/payment-gateway";
import {
  calculateRefundAmount,
  initiateRefund,
} from "@/lib/services/refund-service";
import { POST as cancel } from "../cancel/route";

function createRequest(body: any) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockBookingBase = {
  id: "booking-123",
  userId: "user-123",
  charterId: "charter-123",
  tripId: "trip-123",
  finalPrice: 300.0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
  (auth as any).mockResolvedValue({ user: { id: "user-123", role: "ANGLER" } });
});

describe("POST /api/bookings/cancel - Dual Flow System", () => {
  describe("PAYMENT_PENDING Status - TOKENIZED Flow", () => {
    it("releases card authorization without charge", async () => {
      const tripDate = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000); // 40 days from now
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "TOKENIZED",
        paymentMethod: "CARD",
        paymentIntentId: "token-123",
        date: tripDate,
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (releasePayment as any).mockResolvedValue({
        success: true,
        message: "Authorization released",
      });

      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "CANCELLED",
      });

      const res = await cancel(
        createRequest({
          id: "booking-123",
          reason: "Change of plans",
        })
      );

      expect(res.status).toBe(200);
      expect(releasePayment).toHaveBeenCalledWith("token-123", "booking-123");
      expect(initiateRefund).not.toHaveBeenCalled(); // No refund needed

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: "booking-123" },
        data: expect.objectContaining({
          status: "CANCELLED",
          cancellationReason: "Change of plans",
          paymentReleasedAt: expect.any(Date),
        }),
      });
    });

    it("handles DIRECT flow in PAYMENT_PENDING (should not happen but handle gracefully)", async () => {
      const tripDate = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "DIRECT",
        paymentMethod: "FPX",
        paymentTransactionId: "fpx-123",
        paymentCapturedAt: new Date(),
        date: tripDate,
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (calculateRefundAmount as any).mockReturnValue({
        refundAmount: 300.0,
        refundPercentage: 100,
        daysUntilTrip: 40,
      });
      (initiateRefund as any).mockResolvedValue({
        success: true,
        refundTransactionId: "refund-123",
      });

      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "CANCELLED",
      });

      const res = await cancel(
        createRequest({
          id: "booking-123",
          reason: "Emergency",
        })
      );

      expect(res.status).toBe(200);
      expect(releasePayment).not.toHaveBeenCalled();
      expect(initiateRefund).toHaveBeenCalledWith("booking-123", 300.0, "FULL");
    });
  });

  describe("PAID Status - Cancellation Policy", () => {
    it("applies 80% refund for >30 days cancellation", async () => {
      const tripDate = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000); // 35 days from now
      const mockBooking = {
        ...mockBookingBase,
        status: "PAID",
        paymentFlow: "DIRECT",
        paymentMethod: "FPX",
        paymentTransactionId: "fpx-123",
        date: tripDate,
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (calculateRefundAmount as any).mockReturnValue({
        refundAmount: 240.0, // 80% of 300
        refundPercentage: 80,
        daysUntilTrip: 35,
      });
      (initiateRefund as any).mockResolvedValue({
        success: true,
        refundTransactionId: "refund-80-percent",
      });

      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "CANCELLED",
      });

      const res = await cancel(
        createRequest({
          id: "booking-123",
          reason: "Family emergency",
        })
      );

      expect(res.status).toBe(200);
      expect(calculateRefundAmount).toHaveBeenCalledWith(300.0, tripDate);
      expect(initiateRefund).toHaveBeenCalledWith(
        "booking-123",
        240.0,
        "PARTIAL"
      );

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: "booking-123" },
        data: expect.objectContaining({
          status: "CANCELLED",
          cancellationReason: "Family emergency",
          refundStatus: "PROCESSING",
          refundTransactionId: "refund-80-percent",
        }),
      });
    });

    it("applies 50% refund for 15-30 days cancellation", async () => {
      const tripDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // 20 days from now
      const mockBooking = {
        ...mockBookingBase,
        status: "PAID",
        paymentFlow: "TOKENIZED",
        paymentMethod: "CARD",
        paymentTransactionId: "captured-123",
        date: tripDate,
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (calculateRefundAmount as any).mockReturnValue({
        refundAmount: 150.0, // 50% of 300
        refundPercentage: 50,
        daysUntilTrip: 20,
      });
      (initiateRefund as any).mockResolvedValue({
        success: true,
        refundTransactionId: "refund-50-percent",
      });

      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "CANCELLED",
      });

      const res = await cancel(
        createRequest({
          id: "booking-123",
          reason: "Weather concerns",
        })
      );

      expect(res.status).toBe(200);
      expect(calculateRefundAmount).toHaveBeenCalledWith(300.0, tripDate);
      expect(initiateRefund).toHaveBeenCalledWith(
        "booking-123",
        150.0,
        "PARTIAL"
      );
    });

    it("applies no refund for <15 days cancellation", async () => {
      const tripDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now
      const mockBooking = {
        ...mockBookingBase,
        status: "PAID",
        paymentFlow: "DIRECT",
        paymentMethod: "EWALLET",
        paymentTransactionId: "ewallet-123",
        date: tripDate,
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (calculateRefundAmount as any).mockReturnValue({
        refundAmount: 0.0, // No refund
        refundPercentage: 0,
        daysUntilTrip: 10,
      });

      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "CANCELLED",
      });

      const res = await cancel(
        createRequest({
          id: "booking-123",
          reason: "Last minute change",
        })
      );

      expect(res.status).toBe(200);
      expect(calculateRefundAmount).toHaveBeenCalledWith(300.0, tripDate);
      expect(initiateRefund).not.toHaveBeenCalled(); // No refund

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: "booking-123" },
        data: expect.objectContaining({
          status: "CANCELLED",
          cancellationReason: "Last minute change",
          refundStatus: null, // No refund processing
          refundTransactionId: null,
        }),
      });
    });
  });

  describe("Authorization", () => {
    it("allows user to cancel their own booking", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        paymentFlow: "TOKENIZED",
        userId: "user-123", // Matches authenticated user
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (releasePayment as any).mockResolvedValue({ success: true });
      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "CANCELLED",
      });

      const res = await cancel(
        createRequest({
          id: "booking-123",
          reason: "Test",
        })
      );

      expect(res.status).toBe(200);
    });

    it("prevents user from cancelling others' bookings", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        userId: "other-user-456", // Different user
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);

      const res = await cancel(
        createRequest({
          id: "booking-123",
          reason: "Test",
        })
      );

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("Not authorized to cancel this booking");
    });

    it("allows guest to cancel by email match", async () => {
      (auth as any).mockResolvedValue(null); // No authenticated user

      const mockBooking = {
        ...mockBookingBase,
        status: "PAYMENT_PENDING",
        userId: null, // Guest booking
        guestEmail: "guest@example.com",
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (releasePayment as any).mockResolvedValue({ success: true });
      (prisma.booking.update as any).mockResolvedValue({
        ...mockBooking,
        status: "CANCELLED",
      });

      const res = await cancel(
        createRequest({
          id: "booking-123",
          reason: "Test",
          guestEmail: "guest@example.com", // Matching email
        })
      );

      expect(res.status).toBe(200);
    });
  });

  describe("Error Handling", () => {
    it("handles refund processing failure", async () => {
      const tripDate = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);
      const mockBooking = {
        ...mockBookingBase,
        status: "PAID",
        paymentFlow: "DIRECT",
        date: tripDate,
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);
      (calculateRefundAmount as any).mockReturnValue({
        refundAmount: 240.0,
        refundPercentage: 80,
        daysUntilTrip: 35,
      });
      (initiateRefund as any).mockResolvedValue({
        success: false,
        error: "Payment processor error",
      });

      const res = await cancel(
        createRequest({
          id: "booking-123",
          reason: "Test",
        })
      );

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain("Failed to process refund");
    });

    it("prevents cancellation of already cancelled bookings", async () => {
      const mockBooking = {
        ...mockBookingBase,
        status: "CANCELLED", // Already cancelled
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);

      const res = await cancel(
        createRequest({
          id: "booking-123",
          reason: "Test",
        })
      );

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain(
        "only be cancelled in PENDING, PAYMENT_PENDING or PAID status"
      );
    });

    it("requires cancellation reason", async () => {
      const res = await cancel(
        createRequest({
          id: "booking-123",
          // Missing reason
        })
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("id and reason required");
    });
  });
});
