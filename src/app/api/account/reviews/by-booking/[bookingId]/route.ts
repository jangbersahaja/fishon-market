import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { logger } from "@/lib/logger";
import { connection, NextResponse } from "next/server";

const UNKNOWN_BOOKING_ID = "unknown";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  let bookingId = UNKNOWN_BOOKING_ID; // For error logging
  try {
    await connection();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    bookingId = resolvedParams.bookingId;

    // Verify ownership first
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true },
    });

    if (!booking || booking.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch review by booking ID
    const review = await prisma.review.findUnique({
      where: { bookingId },
      select: {
        id: true,
        overallRating: true,
        badges: true,
        comment: true,
        photos: true,
        videos: true,
        tripDate: true,
        createdAt: true,
        published: true,
      },
    });

    // Return null instead of 404 when review doesn't exist (this is a valid state)
    if (!review) {
      return NextResponse.json(null);
    }

    return NextResponse.json(review);
  } catch (error) {
    logger.error("Error fetching review by booking ID", {
      bookingId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
