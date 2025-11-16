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
import { BookingCountdown } from "@/components/booking";
import { Button } from "@/components/ui/button";
import { formatTimeRange } from "@/lib/booking/booking-time";
import {
  convert24to12Hour,
  formatCurrency,
  formatTripDuration,
  getTimeRemaining,
  getTripCountdown,
  getUrgencyLevel,
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
        <h4 className="text-sm">
          {booking.tripName} •{" "}
          <span>
            {formatTripDuration(booking.durationHours, booking.days)}
            {booking.startTime && (
              <span>
                {" "}
                • Starts at {convert24to12Hour(booking.startTime ?? "")}
              </span>
            )}
          </span>
        </h4>
      </div>

      {/* Details */}
      <div className="flex flex-col items-end justify-between gap-4 pt-4 mb-4 text-gray-700 border-t border-gray-200 sm:flex-row">
        <div className="flex-1 w-full">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="capitalize">{booking.location}</span>
            </div>
            {/* Time Slots Display */}
            {booking.timeSlots && booking.timeSlots.length > 0 ? (
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col gap-1">
                  {booking.timeSlots.map((slot) => (
                    <span
                      key={slot.day}
                      className={`text-gray-700 ${slot.day === 1 ? "font-medium" : "font-light"}`}
                    >
                      <span className="font-medium">
                        {slot.day === 1 ? "" : `Day ${slot.day}: `}
                      </span>
                      {new Date(slot.date).toLocaleDateString("en-MY", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        timeZone: "Asia/Kuala_Lumpur",
                      })}{" "}
                      • {formatTimeRange(slot.startDateTime, slot.endDateTime)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              // Fallback to legacy time display
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
            )}

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
          {booking.status === "PAID" || booking.status === "COMPLETED" ? (
            <span className="px-3 text-sm text-gray-500 bg-emerald-100">
              PAID
            </span>
          ) : booking.status === "PAYMENT_AUTHORIZED" ? (
            <span className="px-3 text-sm text-blue-700 bg-blue-100">
              PAYMENT RECEIVED
            </span>
          ) : (
            <span className="text-sm text-gray-500">UNPAID</span>
          )}
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(booking.totalPrice)}
          </span>
        </div>
      </div>

      {/* Countdown Timer for PENDING, PAYMENT_AUTHORIZED & AWAITING_PAYMENT status */}
      {(booking.status === "PENDING" ||
        booking.status === "PAYMENT_AUTHORIZED" ||
        booking.status === "AWAITING_PAYMENT") &&
        booking.expiresAt &&
        !timeRemaining.isExpired && (
          <div className="mb-4">
            <BookingCountdown
              expiresAt={booking.expiresAt}
              size="md"
              showIcon={true}
              className="justify-center w-full py-2"
            />
            {booking.status === "AWAITING_PAYMENT" && (
              <p className="mt-2 text-xs text-center text-gray-600">
                Complete payment to secure your booking
              </p>
            )}
            {booking.status === "PAYMENT_AUTHORIZED" && (
              <p className="mt-2 text-xs text-center text-gray-600">
                Awaiting captain acknowledgment.
              </p>
            )}
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

        {/* PAYMENT_AUTHORIZED: View Details + Contact Captain */}
        {booking.status === "PAYMENT_AUTHORIZED" && (
          <>
            <div className="flex gap-3">
              <ViewDetailsButton bookingId={booking.id} fullWidth />
            </div>
            {/* Contact Actions */}
            <div className="p-3 space-y-2 rounded-md bg-blue-50">
              <p className="mb-2 text-xs font-medium text-blue-900">
                Contact Captain
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
                  conversationId={booking.conversationId}
                  fullWidth
                  size="sm"
                />
              </div>
            </div>
          </>
        )}

        {/* AWAITING_PAYMENT: Pay Now + Cancel */}
        {booking.status === "AWAITING_PAYMENT" && (
          <div className="flex flex-col gap-3">
            {/* High urgency alert (< 6 hours remaining) */}
            {booking.expiresAt &&
              getUrgencyLevel(booking.expiresAt) === "high" && (
                <div className="p-3 border border-red-200 rounded-md bg-red-50 animate-pulse">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-900">
                        ⚠️ Payment Required Soon!
                      </p>
                      <p className="mt-0.5 text-xs text-red-700">
                        Your booking will expire if payment is not completed.
                        Secure your spot now!
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                  conversationId={booking.conversationId}
                  fullWidth
                  size="sm"
                  disabled={false}
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
