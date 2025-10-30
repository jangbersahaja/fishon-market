"use client";

import { BookingActions } from "@/components/booking";
import type { BookingStatus } from "@/lib/services/booking-service";

interface BookingConfirmActionsProps {
  bookingId: string;
  charterId: string;
  status: BookingStatus;
  userId?: string | null;
  bookingEmail: string;
}

/**
 * Wrapper component for BookingActions that provides necessary context
 * for the /book/confirm page. BookingActions now handles email verification
 * internally via EmailVerificationModal.
 */
export function BookingConfirmActions({
  bookingId,
  charterId,
  status,
  userId,
  bookingEmail,
}: BookingConfirmActionsProps) {
  // Determine if current user is the logged-in owner
  const isLoggedInOwner = !!userId;

  return (
    <BookingActions
      bookingId={bookingId}
      charterId={charterId}
      status={status}
      isLoggedInOwner={isLoggedInOwner}
      bookingEmail={bookingEmail}
    />
  );
}
