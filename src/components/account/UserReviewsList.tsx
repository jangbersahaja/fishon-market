"use client";

import { ReviewableCharterCard } from "@/components/account/ReviewableCharterCard";
import { StarRating } from "@/components/ratings";
import { Button } from "@/components/ui/button";
import type { ReviewBadgeId } from "@/utils/reviewBadges";
import { resolveBadges } from "@/utils/reviewBadges";
import { AlertCircle, Calendar, Edit2, MapPin, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface Review {
  id: string;
  bookingId: string;
  captainCharterId: string;
  charterName: string;
  overallRating: number;
  badges: string[];
  comment: string | null;
  photos: string[];
  videos: string[];
  approved: boolean;
  published: boolean;
  tripDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ReviewableBooking {
  id: string;
  charterId: string;
  charterName: string;
  tripName: string;
  location: string;
  date: Date;
  status: string;
}

interface UserReviewsListProps {
  reviews: Review[];
  reviewableBookings?: ReviewableBooking[];
}

export function UserReviewsList({ 
  reviews, 
  reviewableBookings = [] 
}: UserReviewsListProps) {
  const locale = useLocale();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) {
      return;
    }

    setDeletingId(reviewId);
    setError(null);

    try {
      const response = await fetch(`/api/account/reviews/${reviewId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete review");
      }

      // Refresh page to show updated list
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete review");
      setDeletingId(null);
    }
  };

  // Show empty state only if no reviews AND no reviewable bookings
  if (reviews.length === 0 && reviewableBookings.length === 0) {
    return (
      <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          No reviews yet
        </h3>
        <p className="mb-6 text-gray-600">
          You haven&apos;t written any reviews yet. After completing a trip, you
          can share your experience.
        </p>
        <Button asChild>
          <Link href={`/${locale}/account/bookings`}>View My Bookings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 text-red-800 border border-red-200 rounded-lg bg-red-50">
          <AlertCircle className="flex-shrink-0 w-4 h-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Reviewable Charters Section */}
      {reviewableBookings.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Ready to Review ({reviewableBookings.length})
            </h2>
            <p className="text-sm text-gray-600">
              Share your experience with these completed trips
            </p>
          </div>
          <div className="space-y-4">
            {reviewableBookings.map((booking) => (
              <ReviewableCharterCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      )}

      {/* Existing Reviews Section */}
      {reviews.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Your Reviews ({reviews.length})
            </h2>
            <p className="text-sm text-gray-600">
              Reviews you&apos;ve written for your completed trips
            </p>
          </div>
          <div className="space-y-4">
            {reviews.map((review) => {
              const badges = resolveBadges(review.badges as ReviewBadgeId[]);
              const canEdit = !review.approved;

              return (
                <div
                  key={review.id}
                  id={`review-${review.id}`}
                  className="p-6 transition-shadow bg-white border border-gray-200 rounded-lg hover:shadow-md"
                >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-semibold text-gray-900">
                  {review.charterName}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <StarRating value={review.overallRating} size={16} />
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {review.published ? (
                  <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-800 bg-green-100 border border-green-200 rounded-full">
                    Published
                  </span>
                ) : review.approved ? (
                  <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-800 bg-blue-100 border border-blue-200 rounded-full">
                    Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 text-xs font-medium border rounded-full bg-amber-100 text-amber-800 border-amber-200">
                    Pending Approval
                  </span>
                )}
              </div>
            </div>

            {/* Trip Date */}
            <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  Trip: {new Date(review.tripDate).toLocaleDateString()}
                </span>
              </div>
              <span className="text-gray-400">•</span>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>
                  Reviewed {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {badges.map((badge) => (
                    <span
                      key={badge.id}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-700 rounded-full bg-blue-50"
                      title={badge.description}
                    >
                      <Image
                        src={badge.iconUrl}
                        alt={badge.label}
                        width={16}
                        height={16}
                      />
                      <span>{badge.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Comment */}
            {review.comment && (
              <div className="mb-4">
                <p className="text-sm leading-relaxed text-gray-700">
                  &quot;{review.comment}&quot;
                </p>
              </div>
            )}

            {/* Media count */}
            {(review.photos.length > 0 || review.videos.length > 0) && (
              <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                {review.photos.length > 0 && (
                  <span>📷 {review.photos.length} photos</span>
                )}
                {review.videos.length > 0 && (
                  <span>🎥 {review.videos.length} videos</span>
                )}
              </div>
            )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/book/confirm?id=${review.bookingId}`}>
                      View Booking
                    </Link>
                  </Button>

                  {canEdit && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        title="Edit functionality coming soon"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(review.id)}
                        disabled={deletingId === review.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {deletingId === review.id ? "Deleting..." : "Delete"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
