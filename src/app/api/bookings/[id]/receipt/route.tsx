import ReceiptTemplate from "@/components/receipt/ReceiptTemplate";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import {
  checkRateLimit,
  getClientIP,
  getRateLimitResetTime,
} from "@/lib/rateLimit";
import {
  enrichBookingWithTripData,
  type EnrichedBooking,
} from "@/lib/services/booking-display-service";
import { renderToStream } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/bookings/[id]/receipt
 * Generate and download PDF receipt for a PAID booking
 * Requires email verification for security
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { email } = body as { email?: string };

    // Fetch booking with user data
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only PAID bookings can generate receipts
    if (booking.status !== "PAID") {
      return NextResponse.json(
        { error: "Receipt is only available for paid bookings" },
        { status: 400 }
      );
    }

    // Determine booking email
    const bookingEmail = booking.user?.email || booking.guestEmail;
    if (!bookingEmail) {
      return NextResponse.json(
        { error: "No email associated with this booking" },
        { status: 400 }
      );
    }

    // Authorization: Two methods
    // 1. Authenticated user owns the booking
    // 2. Email verification (guest or non-owner)

    const isAuthenticatedOwner =
      session?.user?.id && booking.userId === session.user.id;

    if (!isAuthenticatedOwner) {
      // Email verification required
      if (!email) {
        return NextResponse.json(
          { error: "Email verification required" },
          { status: 403 }
        );
      }

      // Validate email matches booking
      if (email.toLowerCase() !== bookingEmail.toLowerCase()) {
        // Rate limiting for failed attempts
        const clientIP = getClientIP(request);
        const rateLimitKey = `receipt:${id}:${clientIP}`;
        const attempts = checkRateLimit(rateLimitKey, 3600000); // 1 hour window

        if (attempts > 3) {
          const resetTime = getRateLimitResetTime(rateLimitKey);
          const minutesRemaining = Math.ceil(resetTime / 60000);
          return NextResponse.json(
            {
              error: "Too many failed attempts. Please try again later.",
              retryAfter: minutesRemaining,
            },
            { status: 429 }
          );
        }

        return NextResponse.json(
          {
            error: "Email does not match booking email",
            attemptsRemaining: Math.max(0, 3 - attempts),
          },
          { status: 403 }
        );
      }
    }

    // Generate receipt number (format: FISHON-YYYYMM-{last6ofBookingId})
    const receiptNumber = `FISHON-${booking.createdAt.getFullYear()}${(
      booking.createdAt.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${booking.id.slice(-6).toUpperCase()}`;

    // Enrich booking with trip/charter data
    const enrichedBooking: EnrichedBooking = await enrichBookingWithTripData(
      booking
    );

    // Prepare receipt data
    const receiptData = {
      booking: {
        id: enrichedBooking.id,
        charterName: enrichedBooking.charterName,
        location: enrichedBooking.location,
        tripName: enrichedBooking.tripName,
        date: enrichedBooking.date,
        days: enrichedBooking.days,
        adults: enrichedBooking.adults,
        children: enrichedBooking.children,
        startTime: enrichedBooking.startTime,
        unitPrice: enrichedBooking.unitPrice,
        totalPrice: enrichedBooking.totalPrice,
        paidAt: enrichedBooking.paidAt,
        createdAt: enrichedBooking.createdAt,
      },
      user: {
        name:
          booking.user?.name ||
          `${booking.guestFirstName || ""} ${
            booking.guestLastName || ""
          }`.trim(),
        email: booking.user?.email || booking.guestEmail || "",
        phone: booking.user?.phone || booking.guestPhone || "",
      },
      receiptNumber,
    };

    // Generate PDF stream
    const pdfStream = await renderToStream(
      <ReceiptTemplate data={receiptData} />
    );

    // Convert to Node.js readable stream
    const nodeStream = Readable.from(pdfStream as any);

    // Create a Response with the stream
    const chunks: Buffer[] = [];
    for await (const chunk of nodeStream) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Return PDF with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Fishon-Receipt-${receiptNumber}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error generating receipt:", error);
    return NextResponse.json(
      { error: "Failed to generate receipt" },
      { status: 500 }
    );
  }
}
