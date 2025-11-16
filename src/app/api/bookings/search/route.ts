import { fetchCharterByIdFromDb } from "@/lib/api/captain-db";
import { prisma } from "@/lib/database/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/bookings/search
 *
 * Search for bookings by email (and optionally phone)
 * Used by "Find My Booking" feature for guest users
 *
 * Query params:
 * - email (required): Email to search
 * - phone (optional): Phone to filter results
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const phone = searchParams.get("phone");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    // Search bookings by user email
    const bookings = await prisma.booking.findMany({
      where: {
        user: {
          email: {
            equals: email,
            mode: "insensitive",
          },
          // Optional phone filter
          ...(phone ? { phone } : {}),
        },
      },
      select: {
        id: true,
        date: true,
        status: true,
        charterId: true,
        tripId: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: 50, // Limit results
    });

    // Enrich with charter data from captain database
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        let charterName = "Charter Trip";

        try {
          // Fetch charter data using captain-db service
          const charter = await fetchCharterByIdFromDb(booking.charterId);
          if (charter?.name) {
            charterName = charter.name;
          }
        } catch (error) {
          console.error(`Failed to fetch charter ${booking.charterId}:`, error);
          // Continue with fallback name
        }

        return {
          id: booking.id,
          charterName,
          date: booking.date,
          status: booking.status,
          anglerName: booking.user?.name || "Guest",
        };
      })
    );

    return NextResponse.json({
      bookings: enrichedBookings,
      count: enrichedBookings.length,
    });
  } catch (error) {
    console.error("Booking search error:", error);
    return NextResponse.json(
      { error: "Failed to search bookings" },
      { status: 500 }
    );
  }
}
