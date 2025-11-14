import ReceiptTemplate from "@/components/receipt/ReceiptTemplate";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/database/prisma";
import {
  enrichBookingWithTripData,
  type EnrichedBooking,
} from "@/lib/services/booking-display-service";
import { renderToStream } from "@react-pdf/renderer";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/account/bookings/[id]/receipt
 * Generate and download PDF receipt for a PAID booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

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
      // Also select guest fields for guest bookings
      // TypeScript will include these by default with the updated schema
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify ownership
    if (booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to access this booking" },
        { status: 403 }
      );
    }

    // Only PAID bookings can generate receipts
    if (booking.status !== "PAID") {
      return NextResponse.json(
        { error: "Receipt is only available for paid bookings" },
        { status: 400 }
      );
    }

    // Generate receipt number (format: FISHON-YYYYMM-{last6ofBookingId})
    const receiptNumber = `FISHON-${booking.createdAt.getFullYear()}${(
      booking.createdAt.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${booking.id.slice(-6).toUpperCase()}`;

    // Enrich booking with trip/charter data
    const enrichedBooking: EnrichedBooking =
      await enrichBookingWithTripData(booking);

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
        name: booking.user?.name || "Guest",
        email: booking.user?.email || "",
        phone: booking.user?.phone || "",
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
