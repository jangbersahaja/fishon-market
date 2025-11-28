import { prisma } from "@/lib/database/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/bookings/by-transaction
 *
 * Lookup a booking by its payment transaction ID.
 * Used by the payment processing page to poll for booking creation
 * after the callback webhook creates it.
 *
 * Query params:
 * - tx: The payment transaction ID from Senang Pay
 */
export async function GET(request: NextRequest) {
  const tx = request.nextUrl.searchParams.get("tx");

  if (!tx) {
    return NextResponse.json(
      { error: "Transaction ID required" },
      { status: 400 }
    );
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        paymentTransactionId: tx,
      },
      select: {
        id: true,
        status: true,
        paidAt: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ bookingId: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        bookingId: booking.id,
        status: booking.status,
        paidAt: booking.paidAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error looking up booking by transaction:", error);
    return NextResponse.json(
      { error: "Failed to lookup booking" },
      { status: 500 }
    );
  }
}
