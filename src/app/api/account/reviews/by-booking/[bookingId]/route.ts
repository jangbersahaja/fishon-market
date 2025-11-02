import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;

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

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Verify ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true },
    });

    if (!booking || booking.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error("Error fetching review by booking ID:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
