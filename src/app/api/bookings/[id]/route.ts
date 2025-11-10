import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/bookings/:id
 *
 * Get a single booking with permission check
 * Used by the messages page to display booking details
 *
 * Returns: Booking object with captain/charter data enriched
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Fetch booking with related data
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Access control: must be the booking owner
    if (booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized access to booking" },
        { status: 403 }
      );
    }

    // Fetch charter data from fishon-captain API
    let charterName = "Charter";
    let captainName = "Captain";
    let captainPhone = "";
    let captainEmail = "";

    try {
      const captainApiUrl = process.env.FISHON_CAPTAIN_API_URL;
      if (captainApiUrl) {
        const response = await fetch(
          `${captainApiUrl}/api/public/v1/charters/${booking.charterId}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
            // Add cache revalidation for fresh data
            next: { revalidate: 300 }, // Cache for 5 minutes
          }
        );

        if (response.ok) {
          const charterData = await response.json();
          charterName = charterData.name || charterName;
          if (charterData.captain) {
            captainName = charterData.captain.displayName || captainName;
            captainPhone = charterData.captain.phone || "";
            captainEmail = charterData.captain.email || "";
          }
        }
      }
    } catch (error) {
      console.error("Error fetching captain data:", error);
      // Continue with default values
    }

    // Transform booking data to match UI expectations
    const guestsData = booking.guests as { adults?: number; children?: number };

    const transformedBooking = {
      id: booking.id,
      charterName,
      charterDate: booking.date.toISOString(),
      days: booking.days,
      guestCount: (guestsData.adults || 0) + (guestsData.children || 0),
      totalPrice: Number(booking.finalPrice),
      captainName,
      captainPhone,
      captainEmail,
      status: booking.status,
      note: booking.note,
    };

    console.log("get_booking", {
      userId: session.user.id,
      bookingId: id,
    });

    return NextResponse.json(transformedBooking);
  } catch (error) {
    console.error("get_booking_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}
