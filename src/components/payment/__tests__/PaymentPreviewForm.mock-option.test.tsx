// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { PaymentPreviewForm } from "../PaymentPreviewForm";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Charter, Trip } from "@fishon/ui";
import type { ComponentProps } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const pushMock = vi.hoisted(() => vi.fn());
const addBookingMock = vi.hoisted(() => vi.fn());
const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const ResizeObserverMock = vi.hoisted(
  () =>
    class {
      observe() {
        return null;
      }
      unobserve() {
        return null;
      }
      disconnect() {
        return null;
      }
    }
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/hooks/useBookingStorage", () => ({
  useBookingStorage: () => ({ addBooking: addBookingMock }),
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

type PaymentPreviewFormProps = ComponentProps<typeof PaymentPreviewForm>;

const baseBookingData: PaymentPreviewFormProps["bookingData"] = {
  charterId: "charter-1",
  tripId: "trip-1",
  date: "2025-01-10",
  days: 1,
  startTime: "07:00",
  adults: 2,
  children: 0,
  firstName: "Ari",
  lastName: "Tan",
  email: "ari@example.com",
  phone: "+60123456789",
  emergencyName: "Jordan",
  emergencyPhone: "+6011222333",
  emergencyRelation: "Sibling",
  participants: [{ name: "Ari Tan", phone: "+60123456789", isBooker: true }],
  sessionStart: Date.now(),
};

const basePricing: PaymentPreviewFormProps["pricing"] = {
  tripPrice: 1000,
  finalPrice: 1200,
  platformFee: 100,
  captainEarnings: 900,
  subtotal: 1000,
  paymentGatewayFee: 18,
  days: 1,
};

const charter = {
  id: 1,
  name: "Test Charter",
  location: "Langkawi",
} as unknown as Charter;

const trip = {
  id: "trip-1",
  name: "Mangrove Adventure",
} as unknown as Trip;

function renderForm(overrides: Partial<PaymentPreviewFormProps> = {}) {
  return render(
    <PaymentPreviewForm
      bookingData={baseBookingData}
      pricing={basePricing}
      charter={charter}
      trip={trip}
      session={null}
      sessionExpiresAt={Date.now() + 30 * 60 * 1000}
      enableMockPayment={false}
      {...overrides}
    />
  );
}

describe("PaymentPreviewForm mock payment option", () => {
  beforeEach(() => {
    pushMock.mockReset();
    addBookingMock.mockReset();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders mock payment option when enabled", () => {
    renderForm({ enableMockPayment: true });
    expect(screen.getByText(/Mock Payment \(Dev Only\)/i)).toBeInTheDocument();
  });

  it("hides mock payment option when disabled", () => {
    renderForm({ enableMockPayment: false });
    expect(
      screen.queryByText(/Mock Payment \(Dev Only\)/i)
    ).not.toBeInTheDocument();
  });

  it("submits mock payment without card fields when selected", async () => {
    const fetchMock = vi
      .mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          booking: { id: "booking-123", status: "PAYMENT_AUTHORIZED" },
        }),
      } as Response);

    renderForm({ enableMockPayment: true });

    fireEvent.click(screen.getByLabelText(/Mock Payment/i));
    fireEvent.click(screen.getByRole("button", { name: /pay rm/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const [, secondCall] = fetchMock.mock.calls;
    const body = JSON.parse(secondCall[1]?.body as string);
    expect(body.paymentMethod).toBe("MOCK");
    expect(body.cardNumber).toBeUndefined();
    expect(addBookingMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "booking-123" })
    );
  });
});
