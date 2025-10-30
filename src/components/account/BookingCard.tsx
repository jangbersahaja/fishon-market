import {
  BookAgainButton,
  CallCaptainButton,
  ChatCaptainButton,
  NavigateButtons,
  PayNowButton,
  RatingDisplay,
  ViewDetailsButton,
  ViewReviewButton,
  WriteReviewButton,
} from "@/components/account/BookingActionButtons";
import { CancelBookingAction } from "@/components/account/CancelBookingAction";
import { Button } from "@/components/ui/button";
import {
  convert24to12Hour,
  formatBookingDate,
  formatCurrency,
  formatTripDuration,
  getTimeRemaining,
  getTripCountdown,
} from "@/lib/helpers/booking-helpers";
import {
  getCancellationReason,
  isCancelled,
  isCompleted,
} from "@/lib/helpers/booking-status-helpers";
import type { BookingWithDetails } from "@/lib/services/booking-service";
import {
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  RotateCcw,
  Users,
} from "lucide-react";
import Link from "next/link";
import { BookingStatusBadge } from "./BookingStatusBadge";

interface BookingCardProps {
  booking: BookingWithDetails;
  userReview?: {
    id: string;
    overallRating: number;
  } | null;
  canReview?: boolean;
}

export function BookingCard({
  booking,
  userReview,
  canReview = false,
}: BookingCardProps) {
  const timeRemaining = getTimeRemaining(booking.expiresAt);
  const completed = isCompleted(booking);
  const cancelled = isCancelled(booking);
  const cancellationInfo = cancelled ? getCancellationReason(booking) : null;

  // Determine if this is a PAID in-progress booking (upcoming trip)
  const isPaidInProgress = booking.status === "PAID" && !completed;

  return (
    <div className="p-6 transition-shadow bg-white border border-gray-200 rounded-lg hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        {/* Trip Start Countdown */}
        {booking.date && new Date(booking.date) > new Date() ? (
          <span className="text-sm font-semibold text-gray-600">
            • {getTripCountdown(new Date(booking.date))}
          </span>
        ) : (
          <span />
        )}
        <BookingStatusBadge status={booking.status} isCompleted={completed} />
      </div>

      <div className="flex flex-col mb-4">
        <h3 className="mb-1 text-lg font-semibold text-gray-900">
          {booking.charterName}
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span className="capitalize">{booking.location}</span>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col items-end justify-between gap-4 pt-4 mb-4 text-gray-700 border-t border-gray-200 sm:flex-row">
        <div className="flex-1 w-full">
          <h4 className="mb-2 text-sm font-semibold">{booking.tripName}</h4>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>
                {formatBookingDate(booking.date)} • {booking.days}{" "}
                {booking.days === 1 ? "day" : "days"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>
                {formatTripDuration(booking.durationHours, booking.days)}
                {booking.startTime && (
                  <span>
                    {" "}
                    • Starts at {convert24to12Hour(booking.startTime ?? "")}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Users className="w-4 h-4 text-gray-400" />
              <span>
                {booking.adults} {booking.adults === 1 ? "adult" : "adults"}
                {booking.children > 0 && (
                  <>
                    {" "}
                    • {booking.children}{" "}
                    {booking.children === 1 ? "child" : "children"}
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 w-fit">
          {booking.status === "PAID" ? (
            <span className="px-3 text-sm text-gray-500 bg-emerald-100">
              PAID
            </span>
          ) : (
            <span className="text-sm text-gray-500">UNPAID</span>
          )}
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(booking.totalPrice)}
          </span>
        </div>
      </div>

      {/* Timer for PENDING status */}
      {booking.status === "PENDING" && !timeRemaining.isExpired && (
        <div className="p-3 mb-4 border rounded-md bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            <Clock className="inline w-4 h-4 mr-1" />
            Hold expires in {timeRemaining.displayText}
          </p>
        </div>
      )}

      {/* Cancellation Reason */}
      {cancelled && cancellationInfo && (
        <div className="p-3 mb-4 border border-red-200 rounded-md bg-red-50">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-900">
                {cancellationInfo.title}
              </p>
              <p className="mt-1 text-sm text-red-700">
                {cancellationInfo.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
        {/* PENDING: Cancel button */}
        {booking.status === "PENDING" && (
          <div className="flex gap-3">
            <ViewDetailsButton bookingId={booking.id} fullWidth />
            <CancelBookingAction bookingId={booking.id} fullWidth />
          </div>
        )}

        {/* APPROVED: Pay Now + Cancel */}
        {booking.status === "APPROVED" && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <ViewDetailsButton bookingId={booking.id} fullWidth />
              <CancelBookingAction bookingId={booking.id} fullWidth />
            </div>
            <PayNowButton bookingId={booking.id} fullWidth />
          </div>
        )}

        {/* PAID In-Progress (upcoming trip): Contact + Navigate */}
        {isPaidInProgress && (
          <>
            <div className="flex gap-3">
              <ViewDetailsButton bookingId={booking.id} fullWidth />
            </div>

            {/* Trip Actions Section */}
            <div className="p-3 space-y-2 rounded-md bg-gray-50">
              <p className="mb-2 text-xs font-medium text-gray-700">
                Trip Actions
              </p>

              <div className="flex gap-2">
                {booking.captainPhone && (
                  <CallCaptainButton
                    phone={booking.captainPhone}
                    fullWidth
                    size="sm"
                  />
                )}
                <ChatCaptainButton
                  bookingId={booking.id}
                  fullWidth
                  size="sm"
                  disabled
                />
              </div>

              {(booking.startingPoint || booking.latitude) && (
                <NavigateButtons
                  location={booking.startingPoint || booking.location}
                  latitude={booking.latitude}
                  longitude={booking.longitude}
                  size="sm"
                />
              )}
            </div>
          </>
        )}

        {/* PAID Completed: Review + Book Again */}
        {completed && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <ViewDetailsButton bookingId={booking.id} fullWidth />
              {/* Book Again */}
              <BookAgainButton charterId={booking.captainCharterId} fullWidth />
            </div>
            {/* Review button */}
            {canReview && !userReview && (
              <WriteReviewButton bookingId={booking.id} fullWidth />
            )}
            {userReview && (
              <ViewReviewButton bookingId={booking.id} fullWidth />
            )}
            {/* Rating Display (for reviewed completed bookings) */}
            {completed && userReview && (
              <div className="mt-4">
                <RatingDisplay rating={userReview.overallRating} />
              </div>
            )}
          </div>
        )}

        {/* Cancelled: Try Book Again */}
        {cancelled && (
          <div className="flex gap-3">
            <ViewDetailsButton bookingId={booking.id} fullWidth />
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/charters/${booking.captainCharterId}`}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Book Again
              </Link>
            </Button>
          </div>
        )}

        {/* REJECTED/EXPIRED: View Details only */}
        {(booking.status === "REJECTED" || booking.status === "EXPIRED") &&
          !cancelled && <ViewDetailsButton bookingId={booking.id} fullWidth />}
      </div>
    </div>
  );
}
