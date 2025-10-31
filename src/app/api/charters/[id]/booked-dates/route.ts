/**
 * GET /api/charters/[id]/booked-dates
 *
 * Returns array of dates that have PAID bookings for this charter.
 * Used by calendar picker to block already-booked dates.
 */

import { prisma } from "@/lib/database/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: charterId } = await params;
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Default to 3 months if no range provided
    const startDate = startDateParam ? new Date(startDateParam) : new Date();
    const endDate = endDateParam
      ? new Date(endDateParam)
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 3);
          return d;
        })();

    // Fetch PAID bookings for this charter in the date range
    // For multi-day bookings, we need to block ALL days in the range
    const bookings = await prisma.booking.findMany({
      where: {
        charterId,
        status: "PAID",
        date: {
          lte: endDate, // Booking starts before or on endDate
        },
      },
      select: {
        date: true,
        days: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    // Expand multi-day bookings into all blocked dates
    const bookedDatesSet = new Set<string>();

    bookings.forEach((booking) => {
      // For each booking, block all days in range [date, date + days - 1]
      for (let i = 0; i < booking.days; i++) {
        const blockedDate = new Date(booking.date);
        blockedDate.setUTCDate(blockedDate.getUTCDate() + i);

        // Only include if within our query range
        if (blockedDate >= startDate && blockedDate <= endDate) {
          const y = blockedDate.getFullYear();
          const m = String(blockedDate.getMonth() + 1).padStart(2, "0");
          const day = String(blockedDate.getDate()).padStart(2, "0");
          bookedDatesSet.add(`${y}-${m}-${day}`);
        }
      }
    });

    // Convert Set to sorted array
    const bookedDates = Array.from(bookedDatesSet).sort();

    return NextResponse.json({ bookedDates });
  } catch (error) {
    console.error("[booked-dates] Error fetching booked dates:", error);
    return NextResponse.json(
      { error: "Failed to fetch booked dates" },
      { status: 500 }
    );
  }
}
