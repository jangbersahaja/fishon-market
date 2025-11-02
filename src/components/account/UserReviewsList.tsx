"use client";

import { StarRating } from "@/components/ratings";
import { Button } from "@/components/ui/button";
import type { ReviewBadgeId } from "@/utils/reviewBadges";
import { resolveBadges } from "@/utils/reviewBadges";
import { AlertCircle, Calendar, Edit2, MapPin, Trash2 } from "lucide-react";
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

interface UserReviewsListProps {
  reviews: Review[];
}

export function UserReviewsList({ reviews }: UserReviewsListProps) {
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

  if (reviews.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No reviews yet
        </h3>
        <p className="text-gray-600 mb-6">
          You haven&apos;t written any reviews yet. After completing a trip, you
          can share your experience.
        </p>
        <Button asChild>
          <Link href="/account/bookings">View My Bookings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {reviews.map((review) => {
        const badges = resolveBadges(review.badges as ReviewBadgeId[]);
        const canEdit = !review.approved;

        return (
          <div
            key={review.id}
            id={`review-${review.id}`}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {review.charterName}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <StarRating value={review.overallRating} size={16} />
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {review.published ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    Published
                  </span>
                ) : review.approved ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    Pending Approval
                  </span>
                )}
              </div>
            </div>

            {/* Trip Date */}
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
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
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                      title={badge.description}
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Comment */}
            {review.comment && (
              <div className="mb-4">
                <p className="text-gray-700 text-sm leading-relaxed">
                  &quot;{review.comment}&quot;
                </p>
              </div>
            )}

            {/* Media count */}
            {(review.photos.length > 0 || review.videos.length > 0) && (
              <div className="mb-4 flex items-center gap-4 text-xs text-gray-500">
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
  );
}
