import { auth } from "@/lib/auth/auth";
import { getCharterById } from "@/lib/services/charter-service";
import type { TripData } from "@/lib/services/trip-service";
import { getTripById } from "@/lib/services/trip-service";
import type { Charter } from "@fishon/ui";
import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PaymentPreviewPage from "../page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/components/payment/PaymentSessionTimer", () => ({
  PaymentSessionTimer: () => <div data-testid="session-timer" />,
}));

vi.mock("@/components/payment/PaymentPreviewForm", () => ({
  PaymentPreviewForm: () => (
    <div data-testid="payment-preview-form">Payment form mock</div>
  ),
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/services/charter-service", () => ({
  getCharterById: vi.fn(),
}));

vi.mock("@/lib/services/trip-service", async (importOriginal) => {
  const mod =
    await importOriginal<typeof import("@/lib/services/trip-service")>();
  return {
    ...mod,
    getTripById: vi.fn(),
  };
});

type BookingPreviewData = {
  charterId: string;
  tripId: string;
  date: string;
  days: number;
  startTime: string;
  adults: number;
  children: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  note?: string;
  participants?: Array<{ name: string; phone: string; isBooker?: boolean }>;
  guestVerification?: { userId: string; email: string };
  sessionStart: number;
};

const MOCK_NOW = 1_700_000_000_000;

const baseBookingData: BookingPreviewData = {
  charterId: "charter-1",
  tripId: "trip-1",
  date: "2024-03-01",
  days: 2,
  startTime: "06:00",
  adults: 2,
  children: 1,
  firstName: "Arya",
  lastName: "Tan",
  email: "arya@example.com",
  phone: "+60182345678",
  emergencyName: "Noor Ibrahim",
  emergencyPhone: "+60111222333",
  emergencyRelation: "Sister",
  note: "Need vegetarian meals.",
  participants: [
    { name: "Arya Tan", phone: "+60182345678", isBooker: true },
    { name: "Ben Low", phone: "+60195551234" },
  ],
  sessionStart: MOCK_NOW - 5 * 60 * 1000,
};

const mockCharter = {
  id: 1,
  name: "Langkawi Flats Charter",
  location: "Langkawi, Kedah",
  address: "Langkawi Jetty",
  description: "A scenic flats experience",
  trip: [],
  species: [],
  techniques: [],
  includes: ["Fishing gear"],
  excludes: [],
  licenseProvided: true,
  pickup: { available: true, included: true },
  policies: {
    catchAndKeep: true,
    catchAndRelease: true,
    childFriendly: true,
  },
  languages: ["English"],
  boat: {
    name: "Seri 1",
    type: "Center Console",
    length: "24 ft",
    capacity: 4,
    features: ["GPS"],
  },
  captain: {
    name: "Captain Amir",
    yearsExperience: 10,
    crewCount: 1,
    intro: "Certified guide",
  },
  fishingType: "inshore",
  tier: "basic",
  cancellation: {
    freeUntilHours: 48,
    afterPolicy: "50% refund minus processing fees",
  },
} as unknown as Charter & {
  cancellation: { freeUntilHours: number; afterPolicy: string };
};

const mockTrip: TripData = {
  id: "trip-1",
  name: "Full Day Expedition",
  price: 1200,
  promoPrice: null,
  durationHours: 8,
  maxAnglers: 4,
  tripType: "OFFSHORE",
  description: "Great for families",
  startTimes: ["06:00"],
  charter: {
    id: "charter-1",
    name: "Langkawi Flats Charter",
    state: "Kedah",
    city: "Langkawi",
    startingPoint: "Langkawi Jetty",
    images: [],
    boat: null,
    includes: [],
    features: [],
    coordinates: null,
    captain: null,
  },
};

async function renderPreviewPage(overrides: Partial<BookingPreviewData> = {}) {
  const payload = { ...baseBookingData, ...overrides };
  const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString(
    "base64"
  );
  const element = await PaymentPreviewPage({
    searchParams: Promise.resolve({ data: encoded }),
  });
  render(element);
}

describe("PaymentPreviewPage layout", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(MOCK_NOW);
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
      expires: new Date(MOCK_NOW + 30 * 60 * 1000).toISOString(),
    } as Session);
    vi.mocked(getCharterById).mockResolvedValue(mockCharter);
    vi.mocked(getTripById).mockResolvedValue(mockTrip);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("renders contact, emergency, and participant sections", async () => {
    await renderPreviewPage();

    expect(
      screen.getByRole("heading", { name: /contact information/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /emergency contact/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /participants/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Noor Ibrahim/)).toBeInTheDocument();
    expect(screen.getByText(/Ben Low/)).toBeInTheDocument();
  });

  it("shows cancellation policy highlights for payment review", async () => {
    await renderPreviewPage();

    expect(
      screen.getByRole("heading", { name: /cancellation policy/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Free cancellation up to 48 hours before departure/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/after this window: 50% refund minus processing fees/i)
    ).toBeInTheDocument();
  });

  it("applies a two column grid layout on large screens", async () => {
    await renderPreviewPage();

    const layout = screen.getByTestId("payment-preview-grid");
    expect(layout).toBeInTheDocument();
    expect(layout.className).toContain("lg:grid-cols-12");
  });
});
