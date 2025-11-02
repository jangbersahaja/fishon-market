// app/api/account/reviews/check/[bookingId]/route.ts
import { authOptions } from "@/lib/auth/auth-options";
import {
  canReviewBooking,
  getReviewByBookingId,
} from "@/lib/services/review-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/account/reviews/check/[bookingId]
 * Check if a booking can be reviewed
 *
 * Returns:
 * {
 *   canReview: boolean;
 *   reason?: string;
 *   existingReview?: Review;
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;
    const check = await canReviewBooking(bookingId, session.user.id);

    // If already reviewed, get the existing review
    let existingReview = null;
    if (!check.canReview && check.reason === "Booking already reviewed") {
      existingReview = await getReviewByBookingId(bookingId);
    }

    return NextResponse.json({
      canReview: check.canReview,
      reason: check.reason,
      existingReview,
    });
  } catch (error) {
    console.error("Error checking review eligibility:", error);
    return NextResponse.json(
      { error: "Failed to check review eligibility" },
      { status: 500 }
    );
  }
}
