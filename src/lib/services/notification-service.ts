/**
 * Notification Service
 * Handles notification creation, retrieval, and real-time delivery
 */

import { prisma } from "@/lib/database/prisma";
import {
  triggerNotification,
  triggerNotificationCount,
} from "@/lib/pusher/server";
import {
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
} from "@/lib/services/email-service";
import {
  sendBookingApprovedSMS,
  sendBookingCancelledSMS,
  sendBookingCreatedSMS,
  sendBookingPaidSMS,
  sendBookingRejectedSMS,
  sendPaymentFailedSMS,
  sendPaymentRefundedSMS,
  sendReviewApprovedSMS,
  sendReviewSubmittedSMS,
} from "@/lib/services/sms-service";
import type { NotificationType } from "@prisma/client";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  bookingId?: string;
  charterId?: string;
  reviewId?: string;
  metadata?: Record<string, any> | null;
  expiresAt?: Date;
}

/**
 * Create a new notification and send via Pusher + optionally email
 */
export async function createNotification(params: CreateNotificationParams) {
  const {
    userId,
    type,
    title,
    message,
    actionUrl,
    actionLabel,
    bookingId,
    charterId,
    reviewId,
    metadata,
    expiresAt,
  } = params;

  // Create notification in database
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      actionUrl: actionUrl || null,
      actionLabel: actionLabel || null,
      bookingId: bookingId || null,
      charterId: charterId || null,
      reviewId: reviewId || null,
      metadata: metadata as any,
      expiresAt: expiresAt || null,
      status: "UNREAD",
    },
  });

  // Get user preferences to check if they want this notification
  const preferences = await getUserPreferences(userId);

  // Check if user wants in-app/push notifications for this type
  const pushKey = `push${type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join("")}` as keyof typeof preferences;

  const shouldSendPush = preferences[pushKey] !== false; // Default to true if not set

  // Send real-time notification via Pusher only if enabled
  if (shouldSendPush) {
    await triggerNotification(userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel,
      createdAt: notification.createdAt,
    });
  }

  // Update unread count
  const unreadCount = await getUnreadCount(userId);
  await triggerNotificationCount(userId, unreadCount);

  // Check if user wants email notifications for this type
  const emailKey = `email${type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join("")}` as keyof typeof preferences;

  const shouldSendEmail = preferences[emailKey] !== false; // Default to true if not set

  if (shouldSendEmail) {
    await sendNotificationEmail(userId, notification);
  }

  // Check if user wants SMS notifications for this type
  const smsKey = `sms${type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join("")}` as keyof typeof preferences;

  const shouldSendSMS = preferences[smsKey] !== false; // Default to true if not set

  if (shouldSendSMS) {
    await sendNotificationSMS(userId, notification);
  }

  return notification;
}

/**
 * Get user's notifications with pagination
 */
export async function getUserNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
    cursor?: string;
  } = {}
) {
  const { unreadOnly = false, limit = 20, cursor } = options;

  const whereClause: any = {
    userId,
    archivedAt: null,
  };

  if (unreadOnly) {
    whereClause.status = "UNREAD";
  }

  if (cursor) {
    whereClause.id = {
      lt: cursor,
    };
  }

  const notifications = await prisma.notification.findMany({
    where: whereClause,
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      booking: {
        select: {
          id: true,
          tripId: true,
          charterId: true,
          date: true,
        },
      },
    },
  });

  const hasMore = notifications.length === limit;
  const nextCursor = hasMore
    ? notifications[notifications.length - 1].id
    : null;

  return {
    notifications,
    nextCursor,
    hasMore,
  };
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      status: "UNREAD",
      archivedAt: null,
    },
  });
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
) {
  const notification = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });

  // Update unread count
  const unreadCount = await getUnreadCount(userId);
  await triggerNotificationCount(userId, unreadCount);

  return notification;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      status: "UNREAD",
    },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });

  // Update unread count to 0
  await triggerNotificationCount(userId, 0);

  return result;
}

/**
 * Archive a notification
 */
export async function archiveNotification(
  notificationId: string,
  userId: string
) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      status: "ARCHIVED",
      archivedAt: new Date(),
    },
  });
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
) {
  return prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId,
    },
  });
}

/**
 * Get or create user notification preferences
 */
export async function getUserPreferences(userId: string) {
  let preferences = await prisma.notificationPreferences.findUnique({
    where: { userId },
  });

  if (!preferences) {
    preferences = await prisma.notificationPreferences.create({
      data: {
        userId,
        // Email preferences - all enabled by default
        emailBookingCreated: true,
        emailBookingApproved: true,
        emailBookingRejected: true,
        emailBookingPaid: true,
        emailBookingCancelled: true,
        emailReviewSubmitted: true,
        emailReviewApproved: true,
        emailReviewRejected: true,
        emailAccountVerified: true,
        emailPaymentFailed: true,
        emailSystemAnnouncement: true,
        // Push preferences - all enabled by default
        pushBookingCreated: true,
        pushBookingApproved: true,
        pushBookingRejected: true,
        pushBookingPaid: true,
        pushBookingCancelled: true,
        pushReviewSubmitted: true,
        pushReviewApproved: true,
        pushReviewRejected: true,
        pushAccountVerified: true,
        pushPaymentFailed: true,
        pushSystemAnnouncement: true,
        // SMS preferences - all enabled by default (opt-in)
        smsBookingCreated: true,
        smsBookingApproved: true,
        smsBookingRejected: true,
        smsBookingPaid: true,
        smsBookingCancelled: true,
        smsReviewSubmitted: true,
        smsReviewApproved: true,
        smsReviewRejected: true,
        smsAccountVerified: true,
        smsPaymentFailed: true,
        smsSystemAnnouncement: true,
      },
    });
  }

  return preferences;
}

/**
 * Update user notification preferences
 */
export async function updateUserPreferences(
  userId: string,
  data: Partial<{
    emailBookingCreated: boolean;
    emailBookingApproved: boolean;
    emailBookingRejected: boolean;
    emailBookingPaid: boolean;
    emailBookingCancelled: boolean;
    emailReviewSubmitted: boolean;
    emailReviewApproved: boolean;
    emailReviewRejected: boolean;
    emailAccountVerified: boolean;
    emailPaymentFailed: boolean;
    emailSystemAnnouncement: boolean;
    pushBookingCreated: boolean;
    pushBookingApproved: boolean;
    pushBookingRejected: boolean;
    pushBookingPaid: boolean;
    pushBookingCancelled: boolean;
    pushReviewSubmitted: boolean;
    pushReviewApproved: boolean;
    pushReviewRejected: boolean;
    pushAccountVerified: boolean;
    pushPaymentFailed: boolean;
    pushSystemAnnouncement: boolean;
    smsBookingCreated: boolean;
    smsBookingApproved: boolean;
    smsBookingRejected: boolean;
    smsBookingPaid: boolean;
    smsBookingCancelled: boolean;
    smsReviewSubmitted: boolean;
    smsReviewApproved: boolean;
    smsReviewRejected: boolean;
    smsAccountVerified: boolean;
    smsPaymentFailed: boolean;
    smsSystemAnnouncement: boolean;
  }>
) {
  return prisma.notificationPreferences.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
    },
    update: data,
  });
}

/**
 * Send notification email based on type
 */
async function sendNotificationEmail(userId: string, notification: any) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user?.email) return;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fishon.my";

    // Send appropriate email based on notification type
    switch (notification.type) {
      case "BOOKING_APPROVED":
        if (
          notification.metadata?.charterName &&
          notification.metadata?.tripDate
        ) {
          await sendBookingApprovedEmail({
            to: user.email,
            userName: user.name || "Angler",
            charterName: notification.metadata.charterName,
            tripDate: notification.metadata.tripDate,
            paymentUrl: `${baseUrl}/bookings/${notification.bookingId}/pay`,
            confirmationUrl: `${baseUrl}/bookings/${notification.bookingId}`,
          });
        }
        break;

      case "BOOKING_REJECTED":
        if (
          notification.metadata?.charterName &&
          notification.metadata?.reason
        ) {
          await sendBookingRejectedEmail({
            to: user.email,
            userName: user.name || "Angler",
            charterName: notification.metadata.charterName,
            reason: notification.metadata.reason,
            searchUrl: `${baseUrl}/charters`,
          });
        }
        break;

      // Add more email types as needed
      default:
        console.log(
          `[Notification] No email handler for type: ${notification.type}`
        );
    }
  } catch (error) {
    console.error("[Notification] Failed to send email:", error);
  }
}

/**
 * Send notification SMS based on type
 */
async function sendNotificationSMS(userId: string, notification: any) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, name: true },
    });

    // Skip SMS if user has no phone number
    if (!user?.phone) {
      console.log(
        `[Notification] User ${userId} has no phone number, skipping SMS`
      );
      return;
    }

    // Send appropriate SMS based on notification type
    switch (notification.type) {
      case "BOOKING_CREATED":
        if (
          notification.metadata?.charterName &&
          notification.metadata?.tripDate &&
          notification.metadata?.totalPrice
        ) {
          await sendBookingCreatedSMS({
            phone: user.phone,
            charterName: notification.metadata.charterName,
            tripDate: notification.metadata.tripDate,
            totalPrice: notification.metadata.totalPrice,
          });
        }
        break;

      case "BOOKING_APPROVED":
        if (
          notification.metadata?.charterName &&
          notification.metadata?.tripDate
        ) {
          await sendBookingApprovedSMS({
            phone: user.phone,
            charterName: notification.metadata.charterName,
            tripDate: notification.metadata.tripDate,
          });
        }
        break;

      case "BOOKING_REJECTED":
        if (notification.metadata?.charterName) {
          await sendBookingRejectedSMS({
            phone: user.phone,
            charterName: notification.metadata.charterName,
            reason: notification.metadata?.reason,
          });
        }
        break;

      case "BOOKING_PAID":
        if (
          notification.metadata?.charterName &&
          notification.metadata?.tripDate
        ) {
          await sendBookingPaidSMS({
            phone: user.phone,
            charterName: notification.metadata.charterName,
            tripDate: notification.metadata.tripDate,
            tripName: notification.metadata?.tripName,
          });
        }
        break;

      case "BOOKING_CANCELLED":
        if (notification.metadata?.charterName) {
          await sendBookingCancelledSMS({
            phone: user.phone,
            charterName: notification.metadata.charterName,
            tripDate: notification.metadata?.tripDate || "",
            reason: notification.metadata?.reason,
          });
        }
        break;

      case "PAYMENT_REFUNDED":
        if (
          notification.metadata?.charterName &&
          notification.metadata?.refundAmount
        ) {
          await sendPaymentRefundedSMS({
            phone: user.phone,
            charterName: notification.metadata.charterName,
            refundAmount: notification.metadata.refundAmount,
          });
        }
        break;

      case "PAYMENT_FAILED":
        if (
          notification.metadata?.charterName &&
          notification.metadata?.tripDate
        ) {
          await sendPaymentFailedSMS({
            phone: user.phone,
            charterName: notification.metadata.charterName,
            tripDate: notification.metadata.tripDate,
          });
        }
        break;

      case "REVIEW_SUBMITTED":
        if (notification.metadata?.charterName) {
          await sendReviewSubmittedSMS({
            phone: user.phone,
            charterName: notification.metadata.charterName,
          });
        }
        break;

      case "REVIEW_APPROVED":
        if (notification.metadata?.charterName) {
          await sendReviewApprovedSMS({
            phone: user.phone,
            charterName: notification.metadata.charterName,
          });
        }
        break;

      // Add more SMS types as needed
      default:
        console.log(
          `[Notification] No SMS handler for type: ${notification.type}`
        );
    }
  } catch (error) {
    console.error("[Notification] Failed to send SMS:", error);
  }
}

/**
 * Clean up expired notifications (run as cron job)
 */
export async function cleanupExpiredNotifications() {
  const result = await prisma.notification.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  console.log(
    `[Notification] Cleaned up ${result.count} expired notifications`
  );
  return result;
}
