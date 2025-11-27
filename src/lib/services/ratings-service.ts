/**
 * Ratings service for fetching review data from the database
 *
 * This service provides server-side functions for fetching rating/review data.
 * Use these in Server Components or API routes - NOT in client components.
 */

import { prisma } from "@/lib/database/prisma";

export interface CharterRatings {
  averageRating: number | null;
  reviewCount: number;
}

export interface CharterReview {
  id: string;
  reviewerName: string;
  reviewerInitials?: string;
  createdAt: string;
  tripName: string;
  overallRating: number;
  review: string;
  badges?: string[];
  media?: Array<{
    id: string;
    type: "image" | "video";
    url: string;
    alt: string;
    poster?: string;
  }>;
}

/**
 * Get ratings summary for a charter
 * @param captainCharterId - The charter ID from the captain backend
 */
export async function getCharterRatings(
  captainCharterId: string
): Promise<CharterRatings> {
  try {
    const result = await prisma.review.aggregate({
      where: {
        captainCharterId,
        approved: true,
        published: true,
      },
      _avg: {
        overallRating: true,
      },
      _count: {
        id: true,
      },
    });

    const avgRating = result._avg.overallRating;
    const count = result._count.id;

    return {
      averageRating:
        avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
      reviewCount: count,
    };
  } catch (error) {
    console.error(
      `Error fetching ratings for charter ${captainCharterId}:`,
      error
    );
    return {
      averageRating: null,
      reviewCount: 0,
    };
  }
}

/**
 * Get ratings for multiple charters in a single query (batch fetch)
 * @param captainCharterIds - Array of charter IDs from the captain backend
 */
export async function getCharterRatingsBatch(
  captainCharterIds: string[]
): Promise<Map<string, CharterRatings>> {
  const ratingsMap = new Map<string, CharterRatings>();

  // Initialize all with empty ratings
  captainCharterIds.forEach((id) => {
    ratingsMap.set(id, { averageRating: null, reviewCount: 0 });
  });

  if (captainCharterIds.length === 0) {
    return ratingsMap;
  }

  try {
    // Fetch all reviews for these charters in one query
    const reviews = await prisma.review.groupBy({
      by: ["captainCharterId"],
      where: {
        captainCharterId: { in: captainCharterIds },
        approved: true,
        published: true,
      },
      _avg: {
        overallRating: true,
      },
      _count: {
        id: true,
      },
    });

    // Map results
    reviews.forEach((r) => {
      ratingsMap.set(r.captainCharterId, {
        averageRating:
          r._avg.overallRating !== null
            ? Math.round(r._avg.overallRating * 10) / 10
            : null,
        reviewCount: r._count.id,
      });
    });
  } catch (error) {
    console.error(`Error fetching batch ratings:`, error);
  }

  return ratingsMap;
}

/**
 * Get detailed reviews for a charter (for charter detail page)
 * @param captainCharterId - The charter ID from the captain backend
 * @param limit - Maximum number of reviews to fetch
 */
export async function getCharterReviews(
  captainCharterId: string,
  limit = 10
): Promise<CharterReview[]> {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        captainCharterId,
        approved: true,
        published: true,
      },
      include: {
        user: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return reviews.map((review) => {
      // Build reviewer name and initials
      const name =
        review.user.name ||
        [review.user.firstName, review.user.lastName]
          .filter(Boolean)
          .join(" ") ||
        "Anonymous";
      const initials = name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

      // Build media array from photos and videos
      const media: CharterReview["media"] = [];
      review.photos?.forEach((url, i) => {
        media.push({
          id: `photo-${review.id}-${i}`,
          type: "image",
          url,
          alt: `Review photo ${i + 1}`,
        });
      });
      review.videos?.forEach((url, i) => {
        media.push({
          id: `video-${review.id}-${i}`,
          type: "video",
          url,
          alt: `Review video ${i + 1}`,
        });
      });

      return {
        id: review.id,
        reviewerName: name,
        reviewerInitials: initials,
        createdAt: review.createdAt.toISOString(),
        tripName: review.charterName, // Use charter name as trip identifier
        overallRating: review.overallRating,
        review: review.comment || "",
        badges: review.badges || [],
        media: media.length > 0 ? media : undefined,
      };
    });
  } catch (error) {
    console.error(
      `Error fetching reviews for charter ${captainCharterId}:`,
      error
    );
    return [];
  }
}
