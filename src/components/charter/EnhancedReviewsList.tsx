"use client";

import StarRating from "@/components/ratings/StarRating";
import { resolveBadges, type ReviewBadgeId } from "@/utils/reviewBadges";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

interface ReviewUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface Review {
  id: string;
  userId: string;
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
  user: ReviewUser;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type SortKey = "relevant" | "recent" | "highest" | "lowest";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "relevant", label: "Most relevant" },
  { value: "recent", label: "Most recent" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

function sortReviews(list: Review[], sort: SortKey): Review[] {
  const reviews = [...list];
  const score = (review: Review) => {
    const rating = review.overallRating ?? 0;
    const badgeScore = (review.badges?.length ?? 0) * 12;
    const mediaScore =
      ((review.photos?.length ?? 0) + (review.videos?.length ?? 0)) * 8;
    const timeScore = review.createdAt.getTime() / 1_000_000_000; // dampened
    return rating * 100 + badgeScore + mediaScore + timeScore;
  };

  const compare: Record<SortKey, (a: Review, b: Review) => number> = {
    relevant: (a, b) => {
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    },
    recent: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    highest: (a, b) => {
      const diff = (b.overallRating ?? 0) - (a.overallRating ?? 0);
      if (diff !== 0) return diff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    },
    lowest: (a, b) => {
      const diff = (a.overallRating ?? 0) - (b.overallRating ?? 0);
      if (diff !== 0) return diff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    },
  };

  return reviews.sort(compare[sort]);
}

function MediaStrip({
  photos,
  videos,
}: {
  photos: string[];
  videos: string[];
}) {
  const allMedia = [...photos, ...videos];
  if (allMedia.length === 0) return null;

  return (
    <div className="mt-3 flex gap-2 overflow-x-auto">
      {photos.map((url, index) => (
        <div
          key={`photo-${index}`}
          className="relative h-15 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100"
        >
          <Image
            src={url}
            alt={`Review photo ${index + 1}`}
            fill
            sizes="128px"
            className="object-cover"
          />
        </div>
      ))}
      {videos.map((url, index) => (
        <div
          key={`video-${index}`}
          className="relative h-15 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-900"
        >
          <video
            className="h-full w-full object-cover"
            controls
            preload="metadata"
            muted
            playsInline
          >
            <source src={url} type="video/mp4" />
          </video>
        </div>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const badges = resolveBadges(review.badges as ReviewBadgeId[]);
  const reviewerName = review.user.name || "Anonymous";
  const reviewerInitials = reviewerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <article className="flex h-full flex-col rounded-3xl border border-black/10 bg-white/95 p-5 shadow-sm transition hover:shadow-md">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {review.user.image ? (
            <div className="relative h-12 w-12 overflow-hidden rounded-full">
              <Image
                src={review.user.image}
                alt={reviewerName}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold uppercase text-gray-700">
              {reviewerInitials}
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {reviewerName}
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(review.createdAt)} · Trip on{" "}
              {formatDate(review.tripDate)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StarRating value={review.overallRating} size={16} showValue />
        </div>
      </header>

      {review.comment && (
        <p className="mt-4 text-sm leading-6 text-gray-700">{review.comment}</p>
      )}

      <MediaStrip photos={review.photos} videos={review.videos} />

      {badges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-dashed border-gray-200 pt-3">
          {badges.map((badge) => (
            <span
              key={`${review.id}-${badge.id}`}
              className="group relative inline-flex"
            >
              <span
                tabIndex={0}
                className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <span>{badge.icon}</span>
                <span>{badge.label}</span>
              </span>
              <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-44 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-center text-xs font-medium text-white shadow-lg group-hover:flex group-focus-within:flex">
                <span className="leading-snug">{badge.description}</span>
              </span>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export default function EnhancedReviewsList({
  reviews,
}: {
  reviews: Review[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("relevant");
  const [showModal, setShowModal] = useState(false);

  const sortedReviews = useMemo(
    () => sortReviews(reviews, sortKey),
    [reviews, sortKey]
  );
  const featuredReviews = sortedReviews.slice(
    0,
    Math.min(8, sortedReviews.length)
  );
  const hasMore = reviews.length > featuredReviews.length;

  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal]);

  useEffect(() => {
    if (showModal) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [showModal]);

  if (!reviews?.length) return null;

  return (
    <section className="mt-6">
      <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold sm:text-lg">
              Anglers&apos; reviews
            </h3>
            <p className="text-xs text-gray-500 sm:text-sm">
              {reviews.length} review{reviews.length === 1 ? "" : "s"} from
              verified trips
            </p>
          </div>
          <label className="text-xs font-medium text-gray-600">
            Sort by
            <select
              className="ml-2 rounded-full border border-black/10 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {featuredReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {hasMore && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#ec2227] shadow-sm transition hover:border-[#ec2227]/40 hover:bg-[#ec2227]/5"
            >
              See all reviews
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-black/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-lg font-semibold">All reviews</h4>
                <p className="text-xs text-gray-500">
                  {sortedReviews.length} review
                  {sortedReviews.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-600">
                  Sort by
                  <select
                    className="ml-2 rounded-full border border-black/10 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
                    value={sortKey}
                    onChange={(event) =>
                      setSortKey(event.target.value as SortKey)
                    }
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  aria-label="Close reviews"
                  onClick={() => setShowModal(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-gray-500 transition hover:text-gray-800"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {sortedReviews.map((review) => (
                  <ReviewCard key={`modal-${review.id}`} review={review} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
