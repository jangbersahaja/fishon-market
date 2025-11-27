/**
 * @deprecated This file uses mock data and is no longer used.
 * For real ratings data from the database, use:
 * - `@/lib/services/ratings-service` for server-side data fetching
 *
 * The functions below are kept for backwards compatibility but should not be used.
 * They return mock data that doesn't match real charter IDs.
 */
import { receipts } from "@/data/mock/receipts";

/**
 * @deprecated Use `getCharterReviews` from `@/lib/services/ratings-service` instead
 */
export function getCharterReviews(charterId: number) {
  return receipts.filter((r) => r.charterId === charterId);
}

/**
 * @deprecated Use `getCharterRatings` from `@/lib/services/ratings-service` instead
 */
export function getAverageRating(charterId: number) {
  const reviews = getCharterReviews(charterId);
  if (!reviews.length) return null;
  const avg =
    reviews.reduce((a, r) => a + (r.overallRating || 0), 0) / reviews.length;
  return Math.round(avg * 10) / 10; // 1 decimal
}
