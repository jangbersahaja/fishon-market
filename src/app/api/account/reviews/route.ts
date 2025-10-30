// app/api/account/reviews/route.ts
import { authOptions } from "@/lib/auth/auth-options";
import {
  canReviewBooking,
  createReview,
  getUserReviews,
} from "@/lib/services/review-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/account/reviews
 * List all reviews by the authenticated user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviews = await getUserReviews(session.user.id);

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/account/reviews
 * Create a new review for a PAID booking
 *
 * Body:
 * {
 *   bookingId: string;
 *   overallRating: number; // 1-5
 *   badges?: string[]; // Array of ReviewBadgeId
 *   comment?: string;
 *   photos?: string[]; // Image URLs (no limit)
 *   videos?: string[]; // Video URLs (max 3)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, overallRating, badges, comment, photos, videos } = body;

    // Validate required fields
    if (!bookingId || !overallRating) {
      return NextResponse.json(
        { error: "Missing required fields: bookingId, overallRating" },
        { status: 400 }
      );
    }

    // Check if booking can be reviewed
    const check = await canReviewBooking(bookingId, session.user.id);
    if (!check.canReview) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }

    if (!check.booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Create review
    const review = await createReview({
      userId: session.user.id,
      bookingId,
      captainCharterId: check.booking.charterId, // Updated field name
      charterName: "", // Will need to fetch from charter data
      overallRating,
      badges,
      comment,
      photos: photos || [],
      videos: videos || [],
      tripDate: check.booking.date,
    });

    return NextResponse.json(
      {
        message: "Review submitted successfully. Pending admin approval.",
        review,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create review" },
      { status: 500 }
    );
  }
}
