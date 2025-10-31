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
    const bookings = await prisma.booking.findMany({
      where: {
        charterId,
        status: "PAID",
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
      },
      distinct: ["date"],
      orderBy: {
        date: "asc",
      },
    });

    // Format dates as YYYY-MM-DD strings
    const bookedDates = bookings.map((booking) => {
      const d = new Date(booking.date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    });

    return NextResponse.json({ bookedDates });
  } catch (error) {
    console.error("[booked-dates] Error fetching booked dates:", error);
    return NextResponse.json(
      { error: "Failed to fetch booked dates" },
      { status: 500 }
    );
  }
}
