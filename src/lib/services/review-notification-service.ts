/**
 * Review Notification Helper Functions
 *
 * These functions should be called from the review API routes when:
 * - A review is submitted by an angler
 * - A review is approved by admin/staff
 * - A review is rejected by admin/staff
 */

import { createNotification } from "./notification-service";

/**
 * Notify angler when their review is submitted for moderation
 */
export async function notifyReviewSubmitted(params: {
  userId: string;
  reviewId: string;
  charterName: string;
  charterId: string;
}) {
  const { userId, reviewId, charterName, charterId } = params;

  return createNotification({
    userId,
    type: "REVIEW_SUBMITTED",
    title: "Review Submitted! ⭐",
    message: `Your review for ${charterName} has been submitted and is awaiting approval. We'll notify you once it's published.`,
    actionUrl: `/my/account/reviews`,
    actionLabel: "View My Reviews",
    reviewId,
    charterId,
    metadata: {
      charterName,
    },
  });
}

/**
 * Notify angler when their review is approved and published
 */
export async function notifyReviewApproved(params: {
  userId: string;
  reviewId: string;
  charterName: string;
  charterId: string;
}) {
  const { userId, reviewId, charterName, charterId } = params;

  return createNotification({
    userId,
    type: "REVIEW_APPROVED",
    title: "Review Approved! 🎉",
    message: `Your review for ${charterName} has been approved and is now visible to other anglers. Thank you for sharing your experience!`,
    actionUrl: `/my/charters/${charterId}#reviews`,
    actionLabel: "View Charter Page",
    reviewId,
    charterId,
    metadata: {
      charterName,
    },
  });
}

/**
 * Notify angler when their review is rejected
 */
export async function notifyReviewRejected(params: {
  userId: string;
  reviewId: string;
  charterName: string;
  charterId: string;
  reason?: string;
}) {
  const { userId, reviewId, charterName, charterId, reason } = params;

  return createNotification({
    userId,
    type: "REVIEW_REJECTED",
    title: "Review Update",
    message: `Your review for ${charterName} could not be approved.${reason ? ` Reason: ${reason}` : ""} Please check our review guidelines and submit again.`,
    actionUrl: `/my/account/reviews`,
    actionLabel: "View My Reviews",
    reviewId,
    charterId,
    metadata: {
      charterName,
      reason,
    },
  });
}

/**
 * Example usage in review API routes:
 *
 * // When angler submits review (POST /api/reviews)
 * const review = await prisma.review.create({ ... });
 * await notifyReviewSubmitted({
 *   userId: session.user.id,
 *   reviewId: review.id,
 *   charterName: review.charterName,
 *   charterId: review.captainCharterId
 * });
 *
 * // When admin approves review (PATCH /api/reviews/[id]/approve)
 * await prisma.review.update({
 *   where: { id },
 *   data: { approved: true, published: true }
 * });
 * await notifyReviewApproved({
 *   userId: review.userId,
 *   reviewId: review.id,
 *   charterName: review.charterName,
 *   charterId: review.captainCharterId
 * });
 *
 * // When admin rejects review (PATCH /api/reviews/[id]/reject)
 * await prisma.review.update({
 *   where: { id },
 *   data: { approved: false, published: false }
 * });
 * await notifyReviewRejected({
 *   userId: review.userId,
 *   reviewId: review.id,
 *   charterName: review.charterName,
 *   charterId: review.captainCharterId,
 *   reason: "Contains inappropriate content"
 * });
 */
