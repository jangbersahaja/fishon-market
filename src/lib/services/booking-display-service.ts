/**
 * Booking Display Service
 *
 * Enriches booking data with trip and charter information for display purposes.
 * Converts new schema (tripId/charterId references + JSON fields) to display-friendly format.
 */

import type { Booking } from "@prisma/client";
import { getTripById, type TripData } from "./trip-service";

/**
 * Enriched booking data with trip and charter information for display
 */
export interface EnrichedBooking extends Booking {
  // Enriched fields from Trip/Charter
  charterName: string;
  location: string;
  tripName: string;
  durationHour: number;

  // Parsed from JSON fields
  adults: number;
  children: number;

  // Converted from Decimal
  unitPrice: number;
  totalPrice: number;

  // Full trip and charter data for additional display
  trip?: TripData;
  charter?: TripData["charter"];
}

/**
 * Enrich booking with trip and charter data for display
 *
 * Fetches trip/charter from captain DB and merges with booking data
 */
export async function enrichBookingWithTripData(
  booking: Booking
): Promise<EnrichedBooking> {
  // Fetch trip data from captain DB
  const trip = await getTripById(booking.tripId);

  if (!trip) {
    throw new Error(`Trip not found for booking ${booking.id}`);
  }

  // Parse guests from JSON
  const guests = booking.guests as { adults: number; children: number } | null;
  const adults = guests?.adults ?? 1;
  const children = guests?.children ?? 0;

  // Convert Decimal to number
  const unitPrice = Number(booking.tripPrice);
  const totalPrice = Number(booking.finalPrice);

  // Build enriched booking
  return {
    ...booking,
    // Enriched from trip/charter
    charterName: trip.charter.name,
    location: `${trip.charter.city}, ${trip.charter.state}`,
    tripName: trip.name,
    durationHour: trip.durationHours,

    // Parsed from JSON
    adults,
    children,

    // Converted from Decimal
    unitPrice,
    totalPrice,

    // Full data for additional display
    trip,
    charter: trip.charter,
  };
}

/**
 * Enrich multiple bookings with trip/charter data
 *
 * Batches requests for better performance
 */
export async function enrichBookingsWithTripData(
  bookings: Booking[]
): Promise<EnrichedBooking[]> {
  return Promise.all(
    bookings.map((booking) => enrichBookingWithTripData(booking))
  );
}

/**
 * Get display-friendly guest count string
 *
 * Example: "2 adult(s), 1 child(ren)" or "2 adult(s)"
 */
export function getGuestCountString(booking: EnrichedBooking): string {
  const parts = [`${booking.adults} adult(s)`];

  if (booking.children > 0) {
    parts.push(`${booking.children} child(ren)`);
  }

  return parts.join(", ");
}

/**
 * Get formatted price string
 *
 * Example: "RM 250.00"
 */
export function getFormattedPrice(price: number): string {
  return `RM ${price.toFixed(2)}`;
}
