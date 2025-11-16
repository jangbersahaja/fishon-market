/**
 * BookingExpiredScreen Component
 *
 * Displays empathetic message when a booking has expired (PENDING or AWAITING_PAYMENT status).
 * Shows booking details, explains why expiration happened, and provides actionable next steps.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  convert24to12Hour,
  formatBookingDate,
} from "@/lib/helpers/booking-helpers";
import { AlertCircle, Calendar, Clock, HelpCircle, Search } from "lucide-react";
import Link from "next/link";

interface BookingExpiredScreenProps {
  booking: {
    id: string;
    status: "EXPIRED";
    date: Date;
    startTime: string;
    expiresAt: Date | null;
    charter: {
      id: string;
      title: string;
      location?: string;
    };
  };
  /** Type of expiration: PENDING (captain didn't respond) or AWAITING_PAYMENT (angler didn't pay) */
  expirationType: "PENDING" | "AWAITING_PAYMENT";
}

export function BookingExpiredScreen({
  booking,
  expirationType,
}: BookingExpiredScreenProps) {
  const isAwaitingPaymentExpiry = expirationType === "AWAITING_PAYMENT";

  return (
    <div className="container max-w-3xl mx-auto px-4 py-12">
      {/* Icon + Heading */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-600 mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Booking Expired
        </h1>
        <p className="text-lg text-gray-600">
          {isAwaitingPaymentExpiry
            ? "Your 48-hour payment window has passed"
            : "Your booking request timed out"}
        </p>
      </div>

      {/* Expiration Alert */}
      <div className="mb-6 border-amber-200 bg-amber-50 border rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          {isAwaitingPaymentExpiry ? (
            <>
              This booking was approved but payment wasn&apos;t completed within{" "}
              <strong>48 hours</strong>. To keep dates available for other
              anglers, we automatically released this booking.
            </>
          ) : (
            <>
              This booking request expired after <strong>12 hours</strong>{" "}
              without captain approval. The captain may have been unavailable or
              missed the notification.
            </>
          )}
        </div>
      </div>

      {/* Booking Details Card */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Charter Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Charter
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {booking.charter.title}
              </p>
              {booking.charter.location && (
                <p className="text-sm text-gray-600">
                  {booking.charter.location}
                </p>
              )}
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-3 pt-2 border-t">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">
                  {formatBookingDate(booking.date)}
                </p>
                <p className="text-sm text-gray-600">
                  Departure: {convert24to12Hour(booking.startTime)}
                </p>
              </div>
            </div>

            {/* Expiry Timestamp */}
            {booking.expiresAt && (
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-500">
                  Expired on{" "}
                  <span className="font-medium">
                    {new Intl.DateTimeFormat("en-MY", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(booking.expiresAt)}
                  </span>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Educational Section */}
      <Card className="mb-8 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                Why do bookings expire?
              </h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                {isAwaitingPaymentExpiry ? (
                  <>
                    To ensure fair access for all anglers, approved bookings
                    must be paid within 48 hours. This prevents dates from being
                    held indefinitely and helps captains manage their
                    availability effectively.
                  </>
                ) : (
                  <>
                    Booking requests expire after 12 hours to keep the
                    marketplace dynamic and prevent dates from being held
                    without confirmation. Captains receive notifications but may
                    occasionally miss them.
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {/* Primary: Check if date is still available */}
        <Button asChild size="lg" className="flex-1 sm:flex-initial">
          <Link
            href={`/charters/${booking.charter.id}?date=${booking.date.toISOString().split("T")[0]}`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Check Availability
          </Link>
        </Button>

        {/* Secondary: Browse similar charters */}
        <Button
          asChild
          variant="outline"
          size="lg"
          className="flex-1 sm:flex-initial"
        >
          <Link href={`/charters?similar=${booking.charter.id}`}>
            <Search className="w-4 h-4 mr-2" />
            Find Similar Charters
          </Link>
        </Button>
      </div>

      {/* Support Link */}
      <div className="text-center mt-8">
        <p className="text-sm text-gray-600">
          Need help?{" "}
          <Link
            href="/contact?subject=expired-booking"
            className="text-blue-600 hover:text-blue-700 font-medium underline"
          >
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}
