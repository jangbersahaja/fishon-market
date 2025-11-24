"use client";

import { BookingActions } from "@/components/booking";
import type { BookingStatus } from "@/lib/services/booking-service";

interface BookingConfirmActionsProps {
  bookingId: string;
  charterId: string;
  status: BookingStatus;
  userId?: string | null;
  userRole?: string;
  bookingEmail: string;
  captainName?: string;
  captainPhone?: string;
  captainEmail?: string;
  conversationId?: string;
  conversationStatus?: string;
  tripDate?: Date;
  finalPrice?: number;
  locale: string;
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
  userRole,
  bookingEmail,
  captainName,
  captainPhone,
  captainEmail,
  conversationId,
  conversationStatus,
  tripDate,
  finalPrice,
  locale,
}: BookingConfirmActionsProps) {
  // Determine if current user is the logged-in owner
  const isLoggedInOwner = !!userId;

  return (
    <BookingActions
      bookingId={bookingId}
      charterId={charterId}
      status={status}
      isLoggedInOwner={isLoggedInOwner}
      userRole={userRole}
      bookingEmail={bookingEmail}
      captainName={captainName}
      captainPhone={captainPhone}
      captainEmail={captainEmail}
      conversationId={conversationId}
      conversationStatus={conversationStatus}
      tripDate={tripDate}
      finalPrice={finalPrice}
      locale={locale}
    />
  );
}
