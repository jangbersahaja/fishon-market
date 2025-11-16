// lib/services/review-service.ts
import { prisma } from "@/lib/database/prisma";
import type { ReviewBadgeId } from "@/utils/reviewBadges";
import type { Booking, Review } from "@prisma/client";
import { BookingStatus } from "@prisma/client";

export interface CreateReviewInput {
  userId: string;
  bookingId: string;
  captainCharterId: string;
  charterName: string;
  overallRating: number;
  badges?: ReviewBadgeId[]; // Optional review badges
  comment?: string;
  photos?: string[];
  videos?: string[]; // Max 3 videos
  tripDate: Date;
}

export interface UpdateReviewInput {
  overallRating?: number;
  badges?: ReviewBadgeId[];
  comment?: string;
  photos?: string[];
  videos?: string[];
}

/**
 * Review Service
 *
 * Handles CRUD operations for charter reviews.
 * Business rules:
 * - Only PAID bookings can be reviewed
 * - One review per booking (enforced by unique constraint)
 * - Reviews require admin approval before publishing
 * - Users can edit their own reviews before approval
 * - Photos are optional (max 5)
 */

/**
 * Check if a booking can be reviewed
 */
export async function canReviewBooking(
  bookingId: string,
  userId: string
): Promise<{ canReview: boolean; reason?: string; booking?: Booking }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    return { canReview: false, reason: "Booking not found" };
  }

  if (booking.userId !== userId) {
    return { canReview: false, reason: "Unauthorized" };
  }

  // Reviews available for PAID and COMPLETED bookings only
  if (
    booking.status !== BookingStatus.PAID &&
    booking.status !== BookingStatus.COMPLETED
  ) {
    return {
      canReview: false,
      reason: "Only paid or completed trips can be reviewed",
    };
  }

  // For PAID bookings, reviews available 30 minutes BEFORE trip ends (for sharing experience while fresh)
  // For COMPLETED bookings, reviews are always available
  if (booking.status === BookingStatus.PAID) {
    const tripEndTime = calculateTripEndTime(booking);
    const reviewAvailableTime = new Date(tripEndTime);
    reviewAvailableTime.setMinutes(reviewAvailableTime.getMinutes() - 30); // 30min before end

    const now = new Date();

    if (now < reviewAvailableTime) {
      return {
        canReview: false,
        reason: "Reviews are available 30 minutes before the trip ends",
        booking,
      };
    }
  }

  // Check if already reviewed
  const existingReview = await prisma.review.findUnique({
    where: { bookingId },
  });

  if (existingReview) {
    return {
      canReview: false,
      reason: "Booking already reviewed",
      booking,
    };
  }

  return { canReview: true, booking };
}

/**
 * Calculate trip end time based on booking date, startTime, and days
 * @param booking - Booking object with date, startTime, and days
 * @returns Date object representing when the trip ends
 */
function calculateTripEndTime(booking: Booking): Date {
  const { date, startTime, days } = booking;

  // Create a date object from booking date
  const tripStart = new Date(date);

  // If startTime exists (e.g., "07:00"), parse and set the time
  if (startTime) {
    const [hours, minutes] = startTime.split(":").map(Number);
    tripStart.setHours(hours || 0, minutes || 0, 0, 0);
  } else {
    // Default to start of day if no startTime
    tripStart.setHours(0, 0, 0, 0);
  }

  // Add the duration in days
  // Assuming 8-hour fishing trips (standard charter duration)
  const tripDurationHours = days * 8;
  const tripEnd = new Date(tripStart);
  tripEnd.setHours(tripEnd.getHours() + tripDurationHours);

  return tripEnd;
}

/**
 * Create a new review
 */
export async function createReview(input: CreateReviewInput): Promise<Review> {
  // Validate ratings (1-5)
  if (input.overallRating < 1 || input.overallRating > 5) {
    throw new Error("Overall rating must be between 1 and 5");
  }

  // Validate videos (max 3)
  if (input.videos && input.videos.length > 3) {
    throw new Error("Maximum 3 videos allowed");
  }

  // Check if booking can be reviewed
  const check = await canReviewBooking(input.bookingId, input.userId);
  if (!check.canReview) {
    throw new Error(check.reason || "Cannot review this booking");
  }

  // Create review (auto-approved and published)
  const review = await prisma.review.create({
    data: {
      userId: input.userId,
      bookingId: input.bookingId,
      captainCharterId: input.captainCharterId,
      charterName: input.charterName,
      overallRating: input.overallRating,
      badges: input.badges || [],
      comment: input.comment,
      photos: input.photos || [],
      videos: input.videos || [],
      tripDate: input.tripDate,
      approved: true, // Auto-approved
      published: true, // Auto-published
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  return review;
}

/**
 * Get review by ID
 */
export async function getReviewById(reviewId: string): Promise<Review | null> {
  return prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });
}

/**
 * Get review by booking ID
 */
export async function getReviewByBookingId(
  bookingId: string
): Promise<Review | null> {
  return prisma.review.findUnique({
    where: { bookingId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });
}

/**
 * Get all reviews for a specific charter
 * (only published reviews visible to public)
 */
export async function getCharterReviews(
  captainCharterId: string,
  includeUnpublished = false
): Promise<Review[]> {
  return prisma.review.findMany({
    where: {
      captainCharterId,
      ...(includeUnpublished ? {} : { published: true }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get all reviews by a specific user
 */
export async function getUserReviews(userId: string): Promise<Review[]> {
  return prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Update a review (only if not yet approved)
 */
export async function updateReview(
  reviewId: string,
  userId: string,
  input: UpdateReviewInput
): Promise<Review> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  if (review.userId !== userId) {
    throw new Error("Unauthorized");
  }

  if (review.approved) {
    throw new Error("Cannot edit approved reviews");
  }

  // Validate overall rating if provided
  if (
    input.overallRating !== undefined &&
    (input.overallRating < 1 || input.overallRating > 5)
  ) {
    throw new Error("Overall rating must be between 1 and 5");
  }

  // Validate videos if provided (max 3)
  if (input.videos && input.videos.length > 3) {
    throw new Error("Maximum 3 videos allowed");
  }

  return prisma.review.update({
    where: { id: reviewId },
    data: {
      ...input,
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete a review (only if not yet approved)
 */
export async function deleteReview(
  reviewId: string,
  userId: string
): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  if (review.userId !== userId) {
    throw new Error("Unauthorized");
  }

  if (review.approved) {
    throw new Error("Cannot delete approved reviews");
  }

  await prisma.review.delete({
    where: { id: reviewId },
  });
}

/**
 * Moderate review (admin only)
 */
export async function moderateReview(
  reviewId: string,
  action: "approve" | "reject" | "unpublish"
): Promise<Review> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  switch (action) {
    case "approve":
      return prisma.review.update({
        where: { id: reviewId },
        data: {
          approved: true,
          published: true,
        },
      });

    case "reject":
      return prisma.review.update({
        where: { id: reviewId },
        data: {
          approved: false,
          published: false,
        },
      });

    case "unpublish":
      return prisma.review.update({
        where: { id: reviewId },
        data: {
          published: false,
        },
      });

    default:
      throw new Error("Invalid moderation action");
  }
}

/**
 * Get charter rating statistics
 */
export async function getCharterRatingStats(captainCharterId: string): Promise<{
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>; // { 5: 10, 4: 5, 3: 2, 2: 1, 1: 0 }
  badgeSummary: Array<{ badgeId: string; count: number }>; // Badge frequency
}> {
  const reviews = await prisma.review.findMany({
    where: {
      captainCharterId,
      published: true,
    },
  });

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      badgeSummary: [],
    };
  }

  // Calculate average overall rating
  const sumRatings = reviews.reduce((sum, r) => sum + r.overallRating, 0);
  const averageRating = sumRatings / reviews.length;

  // Rating breakdown
  const ratingBreakdown: Record<number, number> = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };
  reviews.forEach((r) => {
    ratingBreakdown[r.overallRating] =
      (ratingBreakdown[r.overallRating] || 0) + 1;
  });

  // Badge frequency summary
  const badgeCount = new Map<string, number>();
  reviews.forEach((review) => {
    review.badges.forEach((badgeId) => {
      badgeCount.set(badgeId, (badgeCount.get(badgeId) || 0) + 1);
    });
  });

  const badgeSummary = Array.from(badgeCount.entries())
    .map(([badgeId, count]) => ({ badgeId, count }))
    .sort((a, b) => b.count - a.count); // Sort by frequency

  return {
    averageRating,
    totalReviews: reviews.length,
    ratingBreakdown,
    badgeSummary,
  };
}
