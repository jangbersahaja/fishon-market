// app/api/account/reviews/[id]/route.ts
import { authOptions } from "@/lib/auth/auth-options";
import {
  deleteReview,
  getReviewById,
  updateReview,
} from "@/lib/services/review-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/account/reviews/[id]
 * Get a specific review by ID
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
    const review = await getReviewById(id);

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Ensure user owns this review
    if (review.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json(
      { error: "Failed to fetch review" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/account/reviews/[id]
 * Update a review (only if not yet approved)
 *
 * Body:
 * {
 *   overallRating?: number;
 *   badges?: string[];
 *   comment?: string;
 *   photos?: string[];
 *   videos?: string[];
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = await params;

    const updatedReview = await updateReview(id, session.user.id, body);

    return NextResponse.json({
      message: "Review updated successfully",
      review: updatedReview,
    });
  } catch (error: any) {
    console.error("Error updating review:", error);

    if (error.message === "Review not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error.message === "Unauthorized" ||
      error.message === "Cannot edit approved reviews"
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to update review" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/account/reviews/[id]
 * Delete a review (only if not yet approved)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteReview(id, session.user.id);

    return NextResponse.json({
      message: "Review deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting review:", error);

    if (error.message === "Review not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error.message === "Unauthorized" ||
      error.message === "Cannot delete approved reviews"
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to delete review" },
      { status: 500 }
    );
  }
}
