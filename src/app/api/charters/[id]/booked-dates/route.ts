/**
 * GET /api/charters/[id]/booked-dates
 *
 * Returns booking information (dates + time ranges) for PAID/PAYMENT_AUTHORIZED bookings.
 * Supports time-based blocking: only blocks specific time ranges, not full days.
 * Used by calendar picker to show partial availability with orange dots.
 */

import { prisma } from "@/lib/database/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * Extract time in HH:MM format in Malaysia timezone (UTC+8)
 * This ensures consistent time display regardless of server timezone.
 */
function getMalaysiaTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Extract date in YYYY-MM-DD format in Malaysia timezone (UTC+8)
 */
function getMalaysiaDate(date: Date): string {
  const parts = date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return parts; // en-CA gives YYYY-MM-DD format
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: charterId } = await params;
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Parse dates consistently in local time
    // Accepts either YYYY-MM-DD or ISO string format
    const parseLocalDate = (dateStr: string): Date => {
      // If it's YYYY-MM-DD format, parse as local date
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split("-").map(Number);
        return new Date(year, month - 1, day);
      }
      // Otherwise parse as ISO string (will use Date constructor)
      const d = new Date(dateStr);
      // Extract local components to avoid UTC interpretation
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    // Default to 3 months if no range provided
    const startDate = startDateParam
      ? parseLocalDate(startDateParam)
      : new Date();
    const endDate = endDateParam
      ? parseLocalDate(endDateParam)
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 3);
          return d;
        })();

    // Fetch PAID and PAYMENT_AUTHORIZED bookings for this charter in the date range
    // PAYMENT_AUTHORIZED: Temporarily blocks during 12h captain acknowledgment window
    // For multi-day bookings, we need to block ALL days in the range
    const now = new Date();
    const bookings = await prisma.booking.findMany({
      where: {
        charterId,
        date: {
          lte: endDate, // Booking starts before or on endDate
        },
        OR: [
          { status: "PAID" },
          {
            status: "PAYMENT_AUTHORIZED",
            acknowledgmentDeadline: { gte: now }, // Still within 12h window
          },
        ],
      },
      select: {
        date: true,
        days: true,
        startTime: true,
        timeSlots: true,
        status: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    // Process bookings into time-based format
    // Separate full-day blocks from time-based blocks
    const fullDayBlocks = new Set<string>();
    const timeBasedBlocks: Array<{
      date: string;
      startTime: string;
      endTime: string;
      bookedStartTime?: string; // Original trip start time for granular blocking
      isFullDay: boolean;
    }> = [];

    bookings.forEach((booking) => {
      // Parse the date from DB as local date (not UTC)
      const bookingDate = new Date(booking.date);

      // Extract year, month, day in LOCAL time (Malaysia GMT+8)
      const startYear = bookingDate.getFullYear();
      const startMonth = bookingDate.getMonth();
      const startDay = bookingDate.getDate();

      // Check if booking has time-based information
      const hasTimeBased =
        booking.startTime &&
        booking.timeSlots &&
        typeof booking.timeSlots === "object" &&
        Array.isArray(booking.timeSlots);

      if (hasTimeBased) {
        // Time-based booking: extract time ranges from timeSlots
        const timeSlots = booking.timeSlots as Array<{
          day: number;
          date: string;
          startDateTime: string;
          endDateTime: string;
        }>;

        timeSlots.forEach((slot) => {
          const slotStartDate = new Date(slot.startDateTime);
          const slotEndDate = new Date(slot.endDateTime);

          // Use Malaysia timezone for consistent time extraction
          const startTimeStr = getMalaysiaTime(slotStartDate);
          const endTimeStr = getMalaysiaTime(slotEndDate);
          const startDateMY = getMalaysiaDate(slotStartDate);
          const endDateMY = getMalaysiaDate(slotEndDate);

          // Check if this is an overnight booking (ends on a different day in Malaysia time)
          const isOvernight = startDateMY !== endDateMY;

          // Track the original booked start time for granular multi-day blocking
          const bookedStartTime = booking.startTime || startTimeStr;

          if (isOvernight) {
            // OVERNIGHT BOOKING: Split into two blocks
            // 1. Start day: startTime to 23:59
            if (
              startDateMY >= getMalaysiaDate(startDate) &&
              startDateMY <= getMalaysiaDate(endDate)
            ) {
              timeBasedBlocks.push({
                date: startDateMY,
                startTime: startTimeStr,
                endTime: "23:59",
                bookedStartTime,
                isFullDay: false,
              });
            }

            // 2. End day: 00:00 to endTime
            if (
              endDateMY >= getMalaysiaDate(startDate) &&
              endDateMY <= getMalaysiaDate(endDate)
            ) {
              timeBasedBlocks.push({
                date: endDateMY,
                startTime: "00:00",
                endTime: endTimeStr,
                bookedStartTime,
                isFullDay: false,
              });
            }
          } else {
            // Same-day booking: single block
            if (
              startDateMY >= getMalaysiaDate(startDate) &&
              startDateMY <= getMalaysiaDate(endDate)
            ) {
              timeBasedBlocks.push({
                date: startDateMY,
                startTime: startTimeStr,
                endTime: endTimeStr,
                bookedStartTime,
                isFullDay: false,
              });
            }
          }
        });
      } else {
        // Full-day booking: block all days in range [date, date + days - 1]
        for (let i = 0; i < booking.days; i++) {
          const blockedDate = new Date(startYear, startMonth, startDay + i);

          const blockedDateMY = getMalaysiaDate(blockedDate);
          const startDateMY = getMalaysiaDate(startDate);
          const endDateMY = getMalaysiaDate(endDate);

          if (blockedDateMY >= startDateMY && blockedDateMY <= endDateMY) {
            fullDayBlocks.add(blockedDateMY);
          }
        }
      }
    });

    return NextResponse.json({
      fullDayBlocks: Array.from(fullDayBlocks).sort(),
      timeBasedBlocks,
    });
  } catch (error) {
    console.error("[booked-dates] Error fetching booked dates:", error);
    return NextResponse.json(
      { error: "Failed to fetch booked dates" },
      { status: 500 }
    );
  }
}
