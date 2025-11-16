/**
 * Booking service for angler dashboard
 *
 * Provides unified interface to fetch and manage bookings for authenticated users.
 * All operations are scoped to the current user's bookings only.
 */

import { prisma } from "@/lib/database/prisma";
import { prismaCaptain } from "@/lib/database/prisma-captain";

export type BookingStatus =
  | "PENDING"
  | "AWAITING_PAYMENT"
  | "PAYMENT_AUTHORIZED"
  | "REJECTED"
  | "EXPIRED"
  | "PAID"
  | "CANCELLED"
  | "UNDER_REVIEW"
  | "COMPLETED";

export interface BookingWithDetails {
  id: string;
  userId: string;
  captainCharterId: string;
  charterName: string;
  location: string;
  tripName: string;
  unitPrice: number;
  startTime: string | null;
  date: Date;
  days: number;
  adults: number;
  children: number;
  totalPrice: number;
  status: BookingStatus;
  expiresAt: Date;
  captainDecisionAt: Date | null;
  paidAt: Date | null;
  note: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Captain contact info
  captainPhone?: string | null;
  captainBackupPhone?: string | null;
  // Location details
  startingPoint?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // Trip details
  durationHours?: number | null;
  // Time slots
  timeSlots?: Array<{
    day: number;
    date: string;
    startDateTime: string;
    endDateTime: string;
  }> | null;
  // Conversation
  conversationId?: string | null;
}

export interface BookingFilters {
  status?: BookingStatus | BookingStatus[];
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

/**
 * Enrich bookings with captain contact info and location details
 * @param bookings - Array of bookings
 * @returns Enriched bookings with captain data
 */
async function enrichBookingsWithCaptainData(
  bookings: any[]
): Promise<BookingWithDetails[]> {
  if (bookings.length === 0) return [];

  // Get unique charter IDs and trip IDs
  const charterIds = [...new Set(bookings.map((b) => b.charterId))];
  const tripIds = [...new Set(bookings.map((b) => b.tripId))];

  // Fetch captain and charter data from fishon-captain database
  const captainDataRaw = await prismaCaptain.$queryRaw<
    Array<{
      id: string;
      name: string;
      city: string;
      state: string;
      captainPhone: string;
      backupPhone: string | null;
      startingPoint: string;
      latitude: any; // Prisma Decimal type
      longitude: any; // Prisma Decimal type
    }>
  >`
    SELECT 
      c.id,
      c.name,
      c.city,
      c.state,
      cp.phone as "captainPhone",
      c."backupPhone",
      c."startingPoint",
      c.latitude,
      c.longitude
    FROM "Charter" c
    INNER JOIN "CaptainProfile" cp ON c."captainId" = cp.id
    WHERE c.id = ANY(${charterIds}::text[])
  `;

  // Fetch trip data from fishon-captain database
  const tripDataRaw = await prismaCaptain.$queryRaw<
    Array<{
      id: string;
      name: string;
      charterId: string;
      durationHours: number;
    }>
  >`
    SELECT 
      id,
      name,
      "charterId",
      "durationHours"
    FROM "Trip"
    WHERE id = ANY(${tripIds}::text[])
  `;

  // Convert Decimal types to numbers and create lookup maps
  const charterMap = new Map(
    captainDataRaw.map((c) => [
      c.id,
      {
        name: c.name,
        city: c.city,
        state: c.state,
        location: `${c.city}, ${c.state}`,
        captainPhone: c.captainPhone,
        captainBackupPhone: c.backupPhone,
        startingPoint: c.startingPoint,
        latitude: c.latitude ? Number(c.latitude) : null,
        longitude: c.longitude ? Number(c.longitude) : null,
      },
    ])
  );

  const tripMap = new Map(
    tripDataRaw.map((t) => [
      t.id,
      {
        name: t.name,
        charterId: t.charterId,
        durationHours: t.durationHours,
      },
    ])
  );

  // Enrich bookings with captain, charter, and trip data
  return bookings.map((booking) => {
    const trip = tripMap.get(booking.tripId);
    const charter = trip ? charterMap.get(trip.charterId) : null;

    // Parse guests JSON
    const guests = booking.guests as {
      adults: number;
      children: number;
    } | null;

    // Parse timeSlots if available
    const timeSlots = booking.timeSlots as Array<{
      day: number;
      date: string;
      startDateTime: string;
      endDateTime: string;
    }> | null;

    // Convert Prisma Decimal types to numbers and map field names
    const serializedBooking = {
      ...booking,
      // Add missing fields from trip/charter
      captainCharterId: booking.charterId, // Map charterId to captainCharterId for backwards compatibility
      charterName: charter?.name || "Unknown Charter",
      location: charter?.location || "Unknown Location",
      tripName: trip?.name || "Unknown Trip",
      durationHours: trip?.durationHours || 0,
      // Map Prisma field names to interface field names
      unitPrice: booking.tripPrice ? Number(booking.tripPrice) : 0,
      totalPrice: booking.finalPrice ? Number(booking.finalPrice) : 0,
      // Convert Decimal fields to numbers
      tripPrice: booking.tripPrice ? Number(booking.tripPrice) : 0,
      finalPrice: booking.finalPrice ? Number(booking.finalPrice) : 0,
      // Extract guests
      adults: guests?.adults || 0,
      children: guests?.children || 0,
      // Captain contact info
      captainPhone: charter?.captainPhone || null,
      captainBackupPhone: charter?.captainBackupPhone || null,
      startingPoint: charter?.startingPoint || null,
      latitude: charter?.latitude || null,
      longitude: charter?.longitude || null,
      discount: booking.discount, // Already JSON
      tax: booking.tax, // Already JSON
      // Time slots
      timeSlots: timeSlots || null,
      // Conversation
      conversationId: (booking as any).conversation?.id || null,
    };

    return serializedBooking as BookingWithDetails;
  });
}

/**
 * Get all bookings for a user with optional filters
 * @param userId - User ID
 * @param filters - Optional filters
 * @returns Array of bookings ordered by creation date (newest first)
 */
export async function getUserBookings(
  userId: string,
  filters?: BookingFilters
): Promise<BookingWithDetails[]> {
  const where: any = { userId };

  if (filters?.status) {
    where.status = Array.isArray(filters.status)
      ? { in: filters.status }
      : filters.status;
  }

  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) {
      where.date.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.date.lte = filters.endDate;
    }
  }

  if (filters?.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    where.OR = [
      { charterName: { contains: term, mode: "insensitive" } },
      { location: { contains: term, mode: "insensitive" } },
      { tripName: { contains: term, mode: "insensitive" } },
    ];
  }

  try {
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        conversation: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Enrich bookings with captain contact and location data
    return await enrichBookingsWithCaptainData(bookings);
  } catch (error) {
    console.error(`Error fetching bookings for user ${userId}:`, error);
    throw new Error("Failed to fetch bookings. Please try again later.");
  }
}

/**
 * Get a single booking by ID (with user ownership check)
 * @param bookingId - Booking ID
 * @param userId - User ID (for ownership verification)
 * @returns Booking or null if not found/unauthorized
 */
export async function getBookingById(
  bookingId: string,
  userId: string
): Promise<BookingWithDetails | null> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        conversation: {
          select: {
            id: true,
          },
        },
      },
    });

    // Ownership check
    if (!booking || booking.userId !== userId) {
      return null;
    }

    // Enrich with captain data
    const enriched = await enrichBookingsWithCaptainData([booking]);
    return enriched[0] || null;
  } catch (error) {
    console.error(`Error fetching booking ${bookingId}:`, error);
    throw new Error("Failed to fetch booking. Please try again later.");
  }
}

/**
 * Get booking statistics for a user
 * @param userId - User ID
 * @returns Object with counts per status and total bookings
 */
export async function getBookingStats(userId: string): Promise<{
  total: number;
  pending: number;
  awaitingPayment: number;
  paymentAuthorized: number;
  paid: number;
  rejected: number;
  expired: number;
  cancelled: number;
}> {
  try {
    const [
      total,
      pending,
      awaitingPayment,
      paymentAuthorized,
      paid,
      rejected,
      expired,
      cancelled,
    ] = await Promise.all([
      prisma.booking.count({ where: { userId } }),
      prisma.booking.count({ where: { userId, status: "PENDING" } }),
      prisma.booking.count({ where: { userId, status: "AWAITING_PAYMENT" } }),
      prisma.booking.count({ where: { userId, status: "PAYMENT_AUTHORIZED" } }),
      prisma.booking.count({ where: { userId, status: "PAID" } }),
      prisma.booking.count({ where: { userId, status: "REJECTED" } }),
      prisma.booking.count({ where: { userId, status: "EXPIRED" } }),
      prisma.booking.count({ where: { userId, status: "CANCELLED" } }),
    ]);

    return {
      total,
      pending,
      awaitingPayment,
      paymentAuthorized,
      paid,
      rejected,
      expired,
      cancelled,
    };
  } catch (error) {
    console.error(`Error fetching booking stats for user ${userId}:`, error);
    throw new Error("Failed to fetch booking statistics.");
  }
}

/**
 * Get upcoming trips (PAID bookings with future dates)
 * @param userId - User ID
 * @returns Array of upcoming trips ordered by date (nearest first)
 */
export async function getUpcomingTrips(
  userId: string
): Promise<BookingWithDetails[]> {
  try {
    const now = new Date();
    const bookings = await prisma.booking.findMany({
      where: {
        userId,
        status: "PAID",
        date: { gte: now },
      },
      orderBy: {
        date: "asc",
      },
    });

    return await enrichBookingsWithCaptainData(bookings);
  } catch (error) {
    console.error(`Error fetching upcoming trips for user ${userId}:`, error);
    throw new Error("Failed to fetch upcoming trips.");
  }
}

/**
 * Get past trips (PAID bookings with past dates)
 * @param userId - User ID
 * @returns Array of past trips ordered by date (most recent first)
 */
export async function getPastTrips(
  userId: string
): Promise<BookingWithDetails[]> {
  try {
    const now = new Date();
    const bookings = await prisma.booking.findMany({
      where: {
        userId,
        status: "PAID",
        date: { lt: now },
      },
      orderBy: {
        date: "desc",
      },
    });

    return await enrichBookingsWithCaptainData(bookings);
  } catch (error) {
    console.error(`Error fetching past trips for user ${userId}:`, error);
    throw new Error("Failed to fetch past trips.");
  }
}

/**
 * Cancel a booking
 * @param bookingId - Booking ID
 * @param userId - User ID (for ownership verification)
 * @param cancellationReason - Optional reason for cancellation
 * @returns Updated booking or null if operation failed
 */
export async function cancelBooking(
  bookingId: string,
  userId: string,
  cancellationReason?: string
): Promise<BookingWithDetails | null> {
  try {
    // Verify ownership
    const booking = await getBookingById(bookingId, userId);
    if (!booking) {
      return null;
    }

    // Only allow cancellation for PENDING or AWAITING_PAYMENT bookings
    if (booking.status !== "PENDING" && booking.status !== "AWAITING_PAYMENT") {
      return null;
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancellationReason: cancellationReason || null,
      },
    });

    // Enrich with captain data
    const enriched = await enrichBookingsWithCaptainData([updated]);
    return enriched[0] || null;
  } catch (error) {
    console.error(`Error cancelling booking ${bookingId}:`, error);
    throw new Error("Failed to cancel booking. Please try again later.");
  }
}
