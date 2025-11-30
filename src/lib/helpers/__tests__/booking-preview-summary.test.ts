import { describe, expect, it } from "vitest";

import type { Charter } from "@fishon/ui";

import type { TripData } from "@/lib/services/trip-service";
import { formatBookingDate } from "../booking-helpers";
import {
  buildBookingPreviewSummary,
  type BookingPreviewPayload,
} from "../booking-preview-summary";

const baseCharter: Charter = {
  id: 1,
  name: "Rompin Sailfish Adventures",
  location: "Kuala Rompin, Malaysia",
  address: "Kuala Rompin Jetty",
  coordinates: { lat: 2.706, lng: 103.389 },
  images: [],
  imageUrl: undefined,
  videos: [],
  description: "Test charter",
  trip: [],
  species: ["Sailfish"],
  techniques: ["Trolling"],
  includes: ["Tackle"],
  excludes: [],
  licenseProvided: true,
  pickup: {
    available: false,
    included: false,
  },
  policies: {
    catchAndKeep: false,
    catchAndRelease: true,
    childFriendly: true,
  },
  languages: ["English"],
  boat: {
    name: "Blue Marlin",
    type: "Center Console",
    length: "32 ft",
    capacity: 6,
    features: ["GPS"],
  },
  captain: {
    name: "Captain Harris",
    avatarUrl: undefined,
    yearsExperience: 12,
    crewCount: 2,
    intro: "Experienced offshore captain",
  },
  fishingType: "offshore",
  tier: "gold",
  schedule: undefined,
  unavailability: [],
};

const baseTrip: TripData = {
  id: "trip_1",
  name: "Full Day Offshore",
  price: 1800,
  promoPrice: null,
  priceOverride: null,
  durationHours: 8,
  maxAnglers: 4,
  tripType: "PRIVATE",
  description: "Full day offshore trip",
  startTimes: ["07:00"],
  charter: {
    id: "charter_1",
    name: "Rompin Sailfish Adventures",
    state: "Pahang",
    city: "Kuala Rompin",
    startingPoint: "Rompin Jetty",
    images: [],
    boat: {
      name: "Blue Marlin",
      capacity: 6,
      type: "Center Console",
    },
    includes: [{ name: "Tackle", isIncluded: true }],
    features: ["GPS"],
    coordinates: {
      latitude: 2.706,
      longitude: 103.389,
    },
    ownerId: "owner_1",
    captain: {
      id: "captain_1",
      displayName: "Captain Harris",
      avatarUrl: null,
      phone: "+60123456789",
      email: "captain@example.com",
    },
  },
};

const baseBookingPayload: BookingPreviewPayload = {
  charterId: "charter_1",
  tripId: "trip_1",
  date: "2025-03-15T00:00:00.000Z",
  days: 1,
  startTime: "07:00",
  adults: 2,
  children: 1,
  firstName: "Jordan",
  lastName: "Tan",
  email: "jordan@example.com",
  phone: "+60123456789",
  emergencyName: "Alex Tan",
  emergencyPhone: "+60199887766",
  emergencyRelation: "Sibling",
  note: "Please prepare light tackle",
  participants: [
    { name: "Jordan Tan", phone: "+60123456789", isBooker: true },
    { name: "Alex Tan", phone: "+60199887766" },
  ],
  guestVerification: { userId: "user_1", email: "guest@example.com" },
  sessionStart: 1_700_000_000_000,
};

function buildSummary(overrides: Partial<BookingPreviewPayload> = {}) {
  return buildBookingPreviewSummary({
    booking: { ...baseBookingPayload, ...overrides },
    charter: baseCharter,
    trip: baseTrip,
  });
}

function addDays(date: Date, days: number) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

describe("buildBookingPreviewSummary", () => {
  it("formats single-day booking details similar to confirmation view", () => {
    const summary = buildSummary();
    const tripDate = new Date(baseBookingPayload.date);

    expect(summary.charter).toEqual({
      name: baseCharter.name,
      location: baseCharter.location,
      tripName: baseTrip.name,
    });

    expect(summary.schedule.primaryDateLabel).toBe(formatBookingDate(tripDate));
    expect(summary.schedule.daysLabel).toBe("1 day");
    expect(summary.schedule.multiDayRangeLabel).toBeUndefined();
    expect(summary.schedule.startTimeLabel).toBe("Starts at 7:00 AM");

    expect(summary.guests.totalGuests).toBe(3);
    expect(summary.guests.totalLabel).toBe("3 guests");
    expect(summary.guests.breakdownLabel).toBe("2 adults, 1 child");

    expect(summary.note).toBe("Please prepare light tackle");
  });

  it("handles multi-day bookings with date range and pluralization", () => {
    const summary = buildSummary({ days: 3, startTime: "05:30" });
    const start = new Date(baseBookingPayload.date);
    const end = addDays(start, 2);

    expect(summary.schedule.daysLabel).toBe("3 days");
    expect(summary.schedule.multiDayRangeLabel).toBe(
      `${formatBookingDate(start)} - ${formatBookingDate(end)}`
    );
    expect(summary.schedule.startTimeLabel).toBe("Starts at 5:30 AM");
  });

  it("orders participants with the booker first even when flag missing", () => {
    const summary = buildSummary({
      participants: [
        { name: "Alex", phone: "111" },
        { name: "Jordan", phone: "222" },
      ],
    });

    expect(summary.participants).toHaveLength(2);
    expect(summary.participants[0]).toMatchObject({
      name: "Alex",
      isBooker: true,
    });
    expect(summary.participants[1].isBooker).toBe(false);
  });

  it("falls back to booker contact when participants missing and omits empty notes", () => {
    const summary = buildSummary({ participants: undefined, note: "   " });

    expect(summary.participants).toEqual([
      {
        name: "Jordan Tan",
        phone: "+60123456789",
        isBooker: true,
      },
    ]);
    expect(summary.note).toBeUndefined();
  });
});
