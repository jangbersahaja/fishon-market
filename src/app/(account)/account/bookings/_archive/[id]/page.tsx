import { BookingStatusRefresh } from "@/app/(marketplace)/book/confirm/BookingStatusRefresh";
import {
  CallCaptainButton,
  ChatCaptainButton,
  NavigateButtons,
  PayNowButton,
  ViewReviewButton,
  WriteReviewButton,
} from "@/components/account/BookingActionButtons";
import { CancelBookingAction } from "@/components/account/CancelBookingAction";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import {
  getCancellationReason,
  isCancelled,
  isCompleted,
} from "@/lib/helpers/booking-status-helpers";
import { getBookingById } from "@/lib/services/booking-service";
import { canReviewBooking } from "@/lib/services/review-service";
import { AlertCircle, ArrowLeft, Download, RotateCcw } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingSummary } from "../BookingSummary";
import { BookingTimeline } from "../BookingTimeline";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?next=/account/bookings/${id}`);
  }

  // Fetch booking with ownership check (includes captain contact + location from service)
  const booking = await getBookingById(id, session.user.id);

  if (!booking) {
    redirect("/account/bookings");
  }

  const tripCompleted = isCompleted(booking);
  const tripCancelled = isCancelled(booking);
  const cancellationInfo = tripCancelled
    ? getCancellationReason(booking)
    : null;
  const isPaidFuture =
    booking.status === "PAID" && !tripCompleted && !tripCancelled;

  // Check if user can review this booking
  const reviewCheck = await canReviewBooking(booking.id, session.user.id);
  const canReview = reviewCheck.canReview;

  // Check if user has already reviewed
  const existingReview = await prisma.review.findUnique({
    where: { bookingId: booking.id },
    select: { id: true, overallRating: true },
  });

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/account/bookings">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bookings
        </Link>
      </Button>

      {/* Smart Refresh - Shows for PENDING/AWAITING_PAYMENT bookings */}
      {(booking.status === "PENDING" ||
        booking.status === "AWAITING_PAYMENT") && (
        <div className="flex justify-end">
          <BookingStatusRefresh status={booking.status} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <BookingSummary booking={booking} />

          {/* Cancellation Reason */}
          {tripCancelled && cancellationInfo && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-1">
                    {cancellationInfo.title}
                  </h4>
                  <p className="text-sm text-red-800">
                    {cancellationInfo.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Booking Timeline
            </h3>
            <BookingTimeline
              status={booking.status}
              createdAt={booking.createdAt}
              captainDecisionAt={booking.captainDecisionAt}
              paidAt={booking.paidAt}
            />
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Actions
            </h3>

            {/* PENDING: Cancel button */}
            {booking.status === "PENDING" && (
              <CancelBookingAction bookingId={booking.id} fullWidth />
            )}

            {/* AWAITING_PAYMENT: Pay Now + Cancel */}
            {booking.status === "AWAITING_PAYMENT" && (
              <>
                <PayNowButton bookingId={booking.id} fullWidth />
                <CancelBookingAction bookingId={booking.id} fullWidth />
              </>
            )}

            {/* PAID Future (upcoming trip): Contact & Navigate */}
            {isPaidFuture && (
              <>
                <div className="space-y-3 p-4 bg-gray-50 rounded-md">
                  <h4 className="font-semibold text-sm text-gray-900">
                    Trip Preparation
                  </h4>

                  {/* Contact Captain */}
                  {booking.captainPhone && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600">Contact Captain</p>
                      <CallCaptainButton
                        phone={booking.captainPhone}
                        fullWidth
                        size="sm"
                      />
                      <ChatCaptainButton
                        conversationId={null}
                        disabled
                        fullWidth
                        size="sm"
                      />
                    </div>
                  )}

                  {/* Navigate to Starting Point */}
                  {(booking.startingPoint || booking.latitude) && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600">
                        Navigate to Starting Point
                      </p>
                      <NavigateButtons
                        location={booking.startingPoint || booking.location}
                        latitude={booking.latitude}
                        longitude={booking.longitude}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* PAID Completed: Review + Book Again */}
            {tripCompleted && (
              <>
                {/* Review button */}
                {canReview && !existingReview && (
                  <WriteReviewButton bookingId={booking.id} fullWidth />
                )}
                {existingReview && (
                  <ViewReviewButton bookingId={booking.id} fullWidth />
                )}

                {/* Book Again */}
                <Button variant="default" className="w-full" asChild>
                  <Link href={`/charters/${booking.captainCharterId}`}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Book Again
                  </Link>
                </Button>
              </>
            )}

            {/* Cancelled: Try Book Again */}
            {tripCancelled && (
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/charters/${booking.captainCharterId}`}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Book Again
                </Link>
              </Button>
            )}

            {/* Download Receipt (for PAID bookings) */}
            {booking.status === "PAID" && (
              <Button asChild variant="outline" className="w-full">
                <a
                  href={`/api/account/bookings/${booking.id}/receipt`}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </a>
              </Button>
            )}

            {/* Divider */}
            <div className="border-t border-gray-200 my-4" />

            {/* Additional Actions */}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/support/help">Contact Support</Link>
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <Link href={`/charters`}>Browse Similar Charters</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
