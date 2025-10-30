import { BookingStatusBadge } from "@/components/account/BookingStatusBadge";
import {
  formatBookingDate,
  formatCurrency,
  getBookingStatusMessage,
} from "@/lib/helpers/booking-helpers";
import type { BookingWithDetails } from "@/lib/services/booking-service";
import { Calendar, Clock, FileText, MapPin, Users } from "lucide-react";

interface BookingSummaryProps {
  booking: BookingWithDetails;
}

export function BookingSummary({ booking }: BookingSummaryProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {booking.charterName}
          </h2>
          <p className="text-gray-600">{booking.tripName}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Status Message */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">
          {getBookingStatusMessage(booking.status)}
        </p>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Location</p>
              <p className="text-sm text-gray-600">{booking.location}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Date</p>
              <p className="text-sm text-gray-600">
                {formatBookingDate(booking.date)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Duration</p>
              <p className="text-sm text-gray-600">
                {booking.days} {booking.days === 1 ? "day" : "days"}
                {booking.startTime && ` • Starting at ${booking.startTime}`}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Guests</p>
              <p className="text-sm text-gray-600">
                {booking.adults} {booking.adults === 1 ? "adult" : "adults"}
                {booking.children > 0 &&
                  `, ${booking.children} ${
                    booking.children === 1 ? "child" : "children"
                  }`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Booking ID</p>
              <p className="text-sm text-gray-600 font-mono">{booking.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      {booking.note && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-1">Your Note</p>
          <p className="text-sm text-blue-800">{booking.note}</p>
        </div>
      )}

      {/* Rejection Reason */}
      {booking.status === "REJECTED" && booking.rejectionReason && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-900 mb-1">
            Rejection Reason
          </p>
          <p className="text-sm text-red-800">{booking.rejectionReason}</p>
        </div>
      )}

      {/* Cancellation Reason */}
      {booking.status === "CANCELLED" && booking.cancellationReason && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm font-medium text-gray-900 mb-1">
            Cancellation Reason
          </p>
          <p className="text-sm text-gray-700">{booking.cancellationReason}</p>
        </div>
      )}

      {/* Pricing */}
      <div className="pt-6 border-t border-gray-200">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Unit Price</span>
            <span className="text-gray-900">
              {formatCurrency(booking.unitPrice)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Days</span>
            <span className="text-gray-900">{booking.days}</span>
          </div>
          <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">
              {formatCurrency(booking.totalPrice)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
