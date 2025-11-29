/**
 * Booking Status UI Helpers
 * Centralized utilities for displaying booking statuses in the UI
 *
 * This file provides consistent status display logic across all components,
 * reducing hardcoded status checks and improving maintainability.
 */

import { BookingStatus } from "@prisma/client";
import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  LucideIcon,
  Search,
  XCircle,
} from "lucide-react";

/**
 * Status display configuration
 */
export interface StatusDisplay {
  label: string;
  color: "default" | "blue" | "green" | "yellow" | "red" | "gray";
  icon: LucideIcon;
  description: string;
} /**
 * Status badge colors (Tailwind classes)
 */
export const STATUS_COLORS = {
  // Active statuses
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  AWAITING_PAYMENT: "bg-blue-100 text-blue-800 border-blue-200",
  PAYMENT_AUTHORIZED: "bg-green-100 text-green-800 border-green-200",
  PAID: "bg-green-100 text-green-800 border-green-200",

  // Review status
  UNDER_REVIEW: "bg-purple-100 text-purple-800 border-purple-200",

  // Completed
  COMPLETED: "bg-gray-100 text-gray-800 border-gray-200",

  // Cancelled/Failed
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  EXPIRED: "bg-red-100 text-red-800 border-red-200",
} as const;

/**
 * Get status display information
 */
export function getStatusDisplay(status: BookingStatus): StatusDisplay {
  const displays: Record<BookingStatus, StatusDisplay> = {
    PENDING: {
      label: "Pending Approval",
      color: "yellow",
      icon: Clock,
      description: "Waiting for captain to review your booking request",
    },
    AWAITING_PAYMENT: {
      label: "Awaiting Payment",
      color: "blue",
      icon: CreditCard,
      description: "Captain approved! Complete payment to confirm your booking",
    },
    PAYMENT_AUTHORIZED: {
      label: "Payment Received",
      color: "green",
      icon: CheckCircle,
      description: "Payment secured, waiting for captain acknowledgment",
    },
    PAID: {
      label: "Confirmed",
      color: "green",
      icon: CheckCircle,
      description: "Booking confirmed and paid",
    },
    UNDER_REVIEW: {
      label: "Under Review",
      color: "default",
      icon: Search,
      description: "Admin is reviewing this booking",
    },
    COMPLETED: {
      label: "Completed",
      color: "gray",
      icon: Calendar,
      description: "Trip completed",
    },
    REJECTED: {
      label: "Rejected",
      color: "red",
      icon: XCircle,
      description: "Captain declined this booking",
    },
    CANCELLED: {
      label: "Cancelled",
      color: "red",
      icon: Ban,
      description: "Booking cancelled",
    },
    EXPIRED: {
      label: "Expired",
      color: "red",
      icon: AlertCircle,
      description: "Booking expired due to timeout",
    },
  };

  return displays[status];
}

/**
 * Get Tailwind badge classes for a status
 */
export function getStatusBadgeClass(status: BookingStatus): string {
  return STATUS_COLORS[status] || STATUS_COLORS.PENDING;
}

/**
 * Check if booking status is in active/pending state
 */
export function isActiveStatus(status: BookingStatus): boolean {
  return ["PENDING", "AWAITING_PAYMENT", "PAYMENT_AUTHORIZED"].includes(status);
}

/**
 * Check if booking status is confirmed (paid or completed)
 */
export function isConfirmedStatus(status: BookingStatus): boolean {
  return ["PAID", "COMPLETED"].includes(status);
}

/**
 * Check if booking status is cancelled/failed
 */
export function isCancelledStatus(status: BookingStatus): boolean {
  return ["REJECTED", "CANCELLED", "EXPIRED"].includes(status);
}

/**
 * Check if payment action is required from angler
 */
export function requiresPaymentAction(status: BookingStatus): boolean {
  return status === "AWAITING_PAYMENT";
}

/**
 * Check if booking is waiting for captain action
 */
export function requiresCaptainAction(status: BookingStatus): boolean {
  return status === "PENDING" || status === "PAYMENT_AUTHORIZED";
}

/**
 * Check if chat should be enabled for this status
 * Chat is locked until payment is received (PAYMENT_AUTHORIZED or PAID)
 */
export function isChatEnabled(status: BookingStatus): boolean {
  return !["PENDING", "AWAITING_PAYMENT"].includes(status);
}

/**
 * Get action button configuration based on status
 */
export interface StatusAction {
  label: string;
  href?: string;
  onClick?: string;
  variant: "primary" | "secondary" | "danger";
  show: boolean;
}

export function getStatusActions(
  status: BookingStatus,
  bookingId: string
): StatusAction[] {
  const actions: StatusAction[] = [];

  switch (status) {
    case "PENDING":
      actions.push({
        label: "Cancel Booking",
        onClick: "handleCancel",
        variant: "danger",
        show: true,
      });
      break;

    case "AWAITING_PAYMENT":
      actions.push(
        {
          label: "Complete Payment",
          href: `/book/payment/${bookingId}`,
          variant: "primary",
          show: true,
        },
        {
          label: "Cancel Booking",
          onClick: "handleCancel",
          variant: "danger",
          show: true,
        }
      );
      break;

    case "PAYMENT_AUTHORIZED":
    case "PAID":
      actions.push({
        label: "Cancel & Request Refund",
        onClick: "handleCancel",
        variant: "danger",
        show: true,
      });
      break;

    case "REJECTED":
    case "CANCELLED":
    case "EXPIRED":
      actions.push({
        label: "Book Again",
        href: "/charters",
        variant: "secondary",
        show: true,
      });
      break;

    case "COMPLETED":
      actions.push({
        label: "Leave Review",
        href: `/bookings/${bookingId}/review`,
        variant: "primary",
        show: true,
      });
      break;

    default:
      break;
  }

  return actions;
}

/**
 * Get status progress information for timeline display
 */
export interface StatusProgress {
  current: number;
  total: number;
  steps: {
    label: string;
    status: "completed" | "current" | "upcoming";
    timestamp?: Date;
  }[];
}

export function getStatusProgress(
  status: BookingStatus,
  bookingFlowType: "MANUAL" | "AUTO",
  timestamps?: {
    createdAt?: Date;
    captainDecisionAt?: Date;
    paidAt?: Date;
    completedAt?: Date;
  }
): StatusProgress {
  if (bookingFlowType === "MANUAL") {
    // Manual Flow: Request → Approval → Payment → Confirmation → Trip
    const steps: StatusProgress["steps"] = [
      {
        label: "Booking Requested",
        status:
          status === "PENDING"
            ? "current"
            : ["AWAITING_PAYMENT", "PAID", "COMPLETED"].includes(status)
              ? "completed"
              : "completed",
        timestamp: timestamps?.createdAt,
      },
      {
        label: "Captain Approval",
        status:
          status === "PENDING"
            ? "upcoming"
            : status === "AWAITING_PAYMENT"
              ? "current"
              : ["PAID", "COMPLETED"].includes(status)
                ? "completed"
                : "completed",
        timestamp: timestamps?.captainDecisionAt,
      },
      {
        label: "Payment",
        status: ["PENDING", "AWAITING_PAYMENT"].includes(status)
          ? "upcoming"
          : status === "PAID"
            ? "current"
            : status === "COMPLETED"
              ? "completed"
              : "completed",
        timestamp: timestamps?.paidAt,
      },
      {
        label: "Trip Confirmed",
        status:
          status === "PAID"
            ? "current"
            : status === "COMPLETED"
              ? "completed"
              : "upcoming",
      },
      {
        label: "Trip Completed",
        status: status === "COMPLETED" ? "completed" : "upcoming",
        timestamp: timestamps?.completedAt,
      },
    ];

    const current = steps.findIndex((s) => s.status === "current") + 1;
    return { current, total: steps.length, steps };
  } else {
    // Auto Flow: Payment → Acknowledgment → Confirmation → Trip
    const steps: StatusProgress["steps"] = [
      {
        label: "Payment Received",
        status:
          status === "PAYMENT_AUTHORIZED"
            ? "current"
            : ["PAID", "COMPLETED"].includes(status)
              ? "completed"
              : "completed",
        timestamp: timestamps?.createdAt,
      },
      {
        label: "Captain Acknowledgment",
        status:
          status === "PAYMENT_AUTHORIZED"
            ? "upcoming"
            : status === "PAID"
              ? "current"
              : status === "COMPLETED"
                ? "completed"
                : "completed",
        timestamp: timestamps?.captainDecisionAt,
      },
      {
        label: "Trip Confirmed",
        status:
          status === "PAID"
            ? "current"
            : status === "COMPLETED"
              ? "completed"
              : "upcoming",
      },
      {
        label: "Trip Completed",
        status: status === "COMPLETED" ? "completed" : "upcoming",
        timestamp: timestamps?.completedAt,
      },
    ];

    const current = steps.findIndex((s) => s.status === "current") + 1;
    return { current, total: steps.length, steps };
  }
}

/**
 * Get user-friendly status message with context
 */
export function getStatusMessage(
  status: BookingStatus,
  bookingFlowType: "MANUAL" | "AUTO",
  context?: {
    captainName?: string;
    expiresAt?: Date;
    paymentDeadline?: Date;
    acknowledgmentDeadline?: Date;
  }
): string {
  const formatDeadline = (date?: Date) => {
    if (!date) return "";
    const hours = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60));
    if (hours < 1) return "less than 1 hour";
    if (hours === 1) return "1 hour";
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""}`;
  };

  switch (status) {
    case "PENDING":
      if (bookingFlowType === "MANUAL") {
        const timeLeft = formatDeadline(context?.expiresAt);
        return `Waiting for ${context?.captainName || "the captain"} to review your request${timeLeft ? `. They have ${timeLeft} to respond.` : "."}`;
      }
      return "Processing your booking request...";

    case "AWAITING_PAYMENT":
      const paymentTimeLeft = formatDeadline(context?.paymentDeadline);
      return `${context?.captainName || "The captain"} approved your booking! Complete payment${paymentTimeLeft ? ` within ${paymentTimeLeft}` : ""} to confirm your spot.`;

    case "PAYMENT_AUTHORIZED":
      const ackTimeLeft = formatDeadline(context?.acknowledgmentDeadline);
      return `Payment received! Waiting for ${context?.captainName || "the captain"} to acknowledge${ackTimeLeft ? ` (${ackTimeLeft} remaining)` : ""}.`;

    case "PAID":
      return `Booking confirmed! ${context?.captainName || "The captain"} is preparing for your trip.`;

    case "UNDER_REVIEW":
      return "Our team is reviewing this booking. We'll update you soon.";

    case "COMPLETED":
      return "Trip completed! We hope you had a great experience.";

    case "REJECTED":
      return `${context?.captainName || "The captain"} couldn't accommodate this booking. You have not been charged.`;

    case "CANCELLED":
      return "You cancelled this booking. Customer cancellations are non-refundable per our cancellation policy.";

    case "EXPIRED":
      if (bookingFlowType === "MANUAL" && status === "EXPIRED") {
        return `${context?.captainName || "The captain"} didn't respond in time. No charges were made.`;
      }
      return "Booking expired. No charges were made.";

    default:
      return "Unknown status";
  }
}
