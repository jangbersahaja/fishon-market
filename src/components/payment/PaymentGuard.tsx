"use client";

import { useBookingStorage } from "@/hooks/useBookingStorage";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface PaymentGuardProps {
  sessionData: {
    tripId: string;
    date: string;
    email: string;
    sessionStart: number;
  };
  locale: string;
}

/**
 * PaymentGuard Component
 *
 * Client-side guard that checks localStorage for existing bookings
 * matching this payment session. If found, redirects to confirmation page.
 *
 * This prevents users from:
 * 1. Double-paying by refreshing the page
 * 2. Accessing the payment preview after successful payment
 */
export function PaymentGuard({ sessionData, locale }: PaymentGuardProps) {
  const { bookings } = useBookingStorage();
  const router = useRouter();

  useEffect(() => {
    // Check if any booking in localStorage matches this session
    const matchingBooking = bookings.find((booking) => {
      // Match by date - booking.date is ISO string like "2025-11-24"
      const bookingDate = booking.date;
      const sessionDate = sessionData.date;

      // Basic match: same date
      const dateMatches = bookingDate === sessionDate;

      // Booking must be recent (created after session started)
      const isRecent = booking.createdAt >= sessionData.sessionStart;

      // Not cancelled or rejected
      const isActiveStatus = !["CANCELLED", "REJECTED"].includes(
        booking.status
      );

      return dateMatches && isRecent && isActiveStatus;
    });

    if (matchingBooking) {
      // Found existing booking - redirect to confirmation
      console.log(
        `Payment already completed for booking ${matchingBooking.id}, redirecting...`
      );
      router.push(`/${locale}/book/confirm?id=${matchingBooking.id}`);
    }
  }, [bookings, sessionData, locale, router]);

  // This component doesn't render anything
  return null;
}
