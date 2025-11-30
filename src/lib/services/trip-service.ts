/**
 * Trip Service
 *
 * Fetches trip and charter data from fishon-captain database using direct DB access
 */

import { prismaCaptain } from "@/lib/database/prisma-captain";

export interface TripData {
  id: string;
  name: string;
  price: number;
  promoPrice: number | null;
  priceOverride: number | null; // Admin's active price override
  durationHours: number;
  maxAnglers: number;
  tripType: string;
  description: string | null;
  startTimes: string[];
  charter: {
    id: string;
    name: string;
    state: string;
    city: string;
    startingPoint: string;
    images: Array<{ url: string }>;
    boat: { name: string; capacity: number; type?: string } | null;
    includes: Array<{ name: string; isIncluded: boolean }>;
    features: string[]; // Charter features (for boat features display)
    coordinates: { latitude: number; longitude: number } | null;
    ownerId: string | null; // User.id of charter owner (for conversation creation)
    captain: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
      phone: string;
      email: string;
    } | null;
  };
}

/**
 * Fetch trip data by ID from captain database using direct DB access
 */
export async function getTripById(tripId: string): Promise<TripData | null> {
  try {
    console.log("🔍 Fetching trip from captain DB:", tripId);

    // Use raw SQL to fetch trip with all related data
    const tripDataRaw = await prismaCaptain.$queryRaw<
      Array<{
        id: string;
        name: string;
        price: any; // Prisma Decimal
        promoPrice: any | null; // Prisma Decimal
        priceOverride: any | null; // Prisma Decimal - Admin's active override
        durationHours: number;
        maxAnglers: number;
        tripType: string;
        description: string | null;
        charterId: string;
        charterName: string;
        charterState: string;
        charterCity: string;
        startingPoint: string;
        latitude: any | null; // Prisma Decimal
        longitude: any | null; // Prisma Decimal
        charterOwnerId: string | null; // User.id of charter owner
        boatName: string | null;
        boatType: string | null;
        boatCapacity: number | null;
        captainId: string | null;
        captainDisplayName: string | null;
        captainAvatarUrl: string | null;
        captainPhone: string | null;
        captainEmail: string | null;
      }>
    >`
      SELECT 
        t.id,
        t.name,
        t.price,
        t."promoPrice",
        t."priceOverride",
        t."durationHours",
        t."maxAnglers",
        t."tripType",
        t.description,
        c.id as "charterId",
        c.name as "charterName",
        c.state as "charterState",
        c.city as "charterCity",
        c."startingPoint",
        c.latitude,
        c.longitude,
        c."ownerId" as "charterOwnerId",
        b.name as "boatName",
        b.type as "boatType",
        b.capacity as "boatCapacity",
        cp.id as "captainId",
        cp."displayName" as "captainDisplayName",
        cp."avatarUrl" as "captainAvatarUrl",
        cp.phone as "captainPhone",
        u.email as "captainEmail"
      FROM "Trip" t
      INNER JOIN "Charter" c ON t."charterId" = c.id
      LEFT JOIN "Boat" b ON c."boatId" = b.id
      LEFT JOIN "CaptainProfile" cp ON c."captainId" = cp.id
      LEFT JOIN "User" u ON cp."userId" = u.id
      WHERE t.id = ${tripId}
    `;

    if (!tripDataRaw || tripDataRaw.length === 0) {
      console.warn("⚠️ Trip not found in captain DB:", tripId);
      return null;
    }

    const trip = tripDataRaw[0];

    // Fetch trip start times
    const startTimesData = await prismaCaptain.$queryRaw<
      Array<{ value: string }>
    >`
      SELECT value
      FROM "TripStartTime"
      WHERE "tripId" = ${trip.id}
      ORDER BY value ASC
    `;

    // Fetch charter images
    const charterImages = await prismaCaptain.$queryRaw<Array<{ url: string }>>`
      SELECT url
      FROM "CharterMedia"
      WHERE "charterId" = ${trip.charterId}
      ORDER BY "sortOrder" ASC, "createdAt" ASC
    `;

    // Fetch charter includes/amenities
    const charterIncludes = await prismaCaptain.$queryRaw<
      Array<{ label: string }>
    >`
      SELECT label
      FROM "CharterAmenity"
      WHERE "charterId" = ${trip.charterId}
    `;

    // Fetch charter features (for boat features display)
    const charterFeatures = await prismaCaptain.$queryRaw<
      Array<{ label: string }>
    >`
      SELECT label
      FROM "CharterFeature"
      WHERE "charterId" = ${trip.charterId}
    `;

    // Build the TripData object
    const tripData: TripData = {
      id: trip.id,
      name: trip.name,
      price: Number(trip.price),
      promoPrice: trip.promoPrice ? Number(trip.promoPrice) : null,
      priceOverride: trip.priceOverride ? Number(trip.priceOverride) : null,
      durationHours: trip.durationHours,
      maxAnglers: trip.maxAnglers,
      tripType: trip.tripType,
      description: trip.description,
      startTimes: startTimesData.map((st) => st.value),
      charter: {
        id: trip.charterId,
        name: trip.charterName,
        state: trip.charterState,
        city: trip.charterCity,
        startingPoint: trip.startingPoint,
        images: charterImages,
        boat:
          trip.boatName && trip.boatCapacity
            ? {
                name: trip.boatName,
                type: trip.boatType || undefined,
                capacity: trip.boatCapacity,
              }
            : null,
        includes: charterIncludes.map((item) => ({
          name: item.label,
          isIncluded: true,
        })),
        features: charterFeatures.map((f) => f.label),
        coordinates:
          trip.latitude && trip.longitude
            ? {
                latitude: Number(trip.latitude),
                longitude: Number(trip.longitude),
              }
            : null,
        ownerId: trip.charterOwnerId, // User.id of charter owner
        captain:
          trip.captainId && trip.captainDisplayName && trip.captainEmail
            ? {
                id: trip.captainId,
                displayName: trip.captainDisplayName,
                avatarUrl: trip.captainAvatarUrl,
                phone: trip.captainPhone || "",
                email: trip.captainEmail,
              }
            : null,
      },
    };

    console.log("✅ Trip data fetched from DB:", {
      tripId: tripData.id,
      tripName: tripData.name,
      charterName: tripData.charter.name,
      hasImages: tripData.charter.images.length > 0,
      hasBoat: !!tripData.charter.boat,
      hasCaptain: !!tripData.charter.captain,
    });

    return tripData;
  } catch (error) {
    console.error("💥 Error fetching trip from captain DB:", error);
    return null;
  }
}

/**
 * Get the display price for a trip (what customers see in UI)
 * Priority: priceOverride > price
 * Note: promoPrice is now used as minimum price floor, not for display
 */
export function getDisplayPrice(trip: TripData): number {
  return trip.priceOverride ?? trip.price;
}

/**
 * Get the effective price for a trip (promo if available, otherwise regular price)
 * @deprecated Use getDisplayPrice instead - promoPrice is now minimum floor, not display price
 */
export function getEffectivePrice(trip: TripData): number {
  return trip.priceOverride ?? trip.price;
}

/**
 * Get the booking price for a trip (what gets charged)
 * Uses priceOverride if set, otherwise base price
 */
export function getBookingPrice(trip: TripData): number {
  return trip.priceOverride ?? trip.price;
}

/**
 * Calculate final booking price
 */
export function calculateFinalPrice(params: {
  tripPrice: number;
  days: number;
  discount?: { percentage: number; amount: number };
  tax?: { percentage: number; amount: number };
}): number {
  const { tripPrice, days, discount, tax } = params;

  let subtotal = tripPrice * days;

  if (discount) {
    subtotal -= discount.amount;
  }

  if (tax) {
    subtotal += tax.amount;
  }

  return Math.max(0, subtotal); // Ensure non-negative
}
