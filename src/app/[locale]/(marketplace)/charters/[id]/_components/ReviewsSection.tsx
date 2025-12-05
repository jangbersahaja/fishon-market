import { EnhancedReviewsList, GuestFeedback } from "@/components/charter";
import {
  getCharterRatingStats,
  getCharterReviews,
} from "@/lib/services/review-service";

interface ReviewsSectionProps {
  charterId: string;
  locale: string;
}

/**
 * Server component that fetches and displays reviews.
 * Designed to be wrapped in Suspense for streaming with PPR.
 */
export async function ReviewsSection({
  charterId,
  locale,
}: ReviewsSectionProps) {
  const [reviews, stats] = await Promise.all([
    getCharterReviews(charterId),
    getCharterRatingStats(charterId),
  ]);

  const ratingAvg = stats.averageRating;
  const ratingCount = stats.totalReviews;

  return (
    <>
      {/* Feedback summary */}
      <GuestFeedback
        reviews={reviews as any}
        ratingAvg={ratingAvg}
        ratingCount={ratingCount}
        locale={locale}
      />
      {/* Reviews (Real database reviews) */}
      <EnhancedReviewsList reviews={reviews as any} />
    </>
  );
}

/**
 * Loading skeleton for reviews section
 */
export function ReviewsSectionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Guest Feedback Skeleton */}
      <div className="p-6 bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gray-200 rounded-full" />
          <div className="space-y-2">
            <div className="w-24 h-6 bg-gray-200 rounded" />
            <div className="w-32 h-4 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Reviews List Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 bg-white border border-gray-200 rounded-xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="space-y-1">
                <div className="w-24 h-4 bg-gray-200 rounded" />
                <div className="w-16 h-3 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="w-full h-4 bg-gray-100 rounded" />
              <div className="w-3/4 h-4 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
