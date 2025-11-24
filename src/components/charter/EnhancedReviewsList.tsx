"use client";

import StarRating from "@/components/ratings/StarRating";
import { resolveBadges, type ReviewBadgeId } from "@/utils/reviewBadges";
import { useTranslations } from "next-intl";
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
    <div className="flex gap-2 mt-3 overflow-x-auto">
      {photos.map((url, index) => (
        <div
          key={`photo-${index}`}
          className="relative w-20 overflow-hidden bg-gray-100 h-15 shrink-0 rounded-xl"
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
          className="relative w-20 overflow-hidden bg-gray-900 h-15 shrink-0 rounded-xl"
        >
          <video
            className="object-cover w-full h-full"
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

function ReviewCard({
  review,
  t,
}: {
  review: Review;
  t: ReturnType<typeof useTranslations>;
}) {
  const badges = resolveBadges(review.badges as ReviewBadgeId[]);
  const reviewerName = review.user.name || "Anonymous";
  const reviewerInitials = reviewerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <article className="flex flex-col h-full p-5 transition border shadow-sm rounded-3xl border-black/10 bg-white/95 hover:shadow-md">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {review.user.image ? (
            <div className="relative w-12 h-12 overflow-hidden rounded-full">
              <Image
                src={review.user.image}
                alt={reviewerName}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-12 h-12 text-sm font-semibold text-gray-700 uppercase bg-gray-100 rounded-full">
              {reviewerInitials}
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {reviewerName}
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(review.createdAt)} · {t("tripOn")}{" "}
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
        <div className="flex flex-wrap gap-2 pt-3 mt-4 border-t border-gray-200 border-dashed">
          {badges.map((badge) => (
            <span
              key={`${review.id}-${badge.id}`}
              className="relative inline-flex group"
            >
              <span
                tabIndex={0}
                className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 text-xs font-medium text-gray-700 border rounded-full border-black/10 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <Image
                  src={badge.iconUrl}
                  alt={badge.label}
                  width={24}
                  height={24}
                />
                <span>{badge.label}</span>
              </span>
              <span className="absolute z-20 hidden px-3 py-2 mt-2 text-xs font-medium text-center text-white -translate-x-1/2 bg-gray-900 rounded-lg shadow-lg pointer-events-none left-1/2 top-full w-44 group-hover:flex group-focus-within:flex">
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
  const t = useTranslations("charter.reviews");
  const [sortKey, setSortKey] = useState<SortKey>("relevant");
  const [showModal, setShowModal] = useState(false);

  const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
    { value: "relevant", label: t("sortRelevant") },
    { value: "recent", label: t("sortRecent") },
    { value: "highest", label: t("sortHighest") },
    { value: "lowest", label: t("sortLowest") },
  ];

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
      <div className="p-5 bg-white border rounded-2xl border-black/10 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold sm:text-lg">{t("title")}</h3>
            <p className="text-xs text-gray-500 sm:text-sm">
              {t("subtitle", {
                count: reviews.length,
                plural: reviews.length === 1 ? "" : "s",
              })}
            </p>
          </div>
          <label className="text-xs font-medium text-gray-600">
            {t("sortBy")}
            <select
              className="px-3 py-1 ml-2 text-xs font-semibold text-gray-700 border rounded-full border-black/10 bg-gray-50"
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

        <div className="grid grid-cols-1 gap-5 mt-5 md:grid-cols-2">
          {featuredReviews.map((review) => (
            <ReviewCard key={review.id} review={review} t={t} />
          ))}
        </div>

        {hasMore && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#ec2227] shadow-sm transition hover:border-[#ec2227]/40 hover:bg-[#ec2227]/5"
            >
              {t("seeAllReviews")}
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/60"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex flex-col w-full h-full max-w-5xl overflow-hidden bg-white shadow-2xl rounded-3xl">
            <div className="flex flex-col gap-3 px-6 py-5 border-b border-black/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-lg font-semibold">{t("allReviews")}</h4>
                <p className="text-xs text-gray-500">
                  {t("reviewsCount", {
                    count: sortedReviews.length,
                    plural: sortedReviews.length === 1 ? "" : "s",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-600">
                  {t("sortBy")}
                  <select
                    className="px-3 py-1 ml-2 text-xs font-semibold text-gray-700 border rounded-full border-black/10 bg-gray-50"
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
                  className="inline-flex items-center justify-center text-gray-500 transition border rounded-full h-9 w-9 border-black/10 hover:text-gray-800"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>
            <div className="flex-1 px-6 py-6 overflow-y-auto">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {sortedReviews.map((review) => (
                  <ReviewCard
                    key={`modal-${review.id}`}
                    review={review}
                    t={t}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
