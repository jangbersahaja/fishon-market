import {
  convert24to12Hour,
  formatBookingDate,
  formatCurrency,
  getBookingStatusMessage,
} from "@/lib/helpers/booking-helpers";
import type { BookingStatus } from "@/lib/services/booking-service";
import { Calendar, Clock, FileText, User, Users } from "lucide-react";

interface BookingDetailsProps {
  booking: {
    id: string;
    charterName: string;
    tripName: string;
    guestName: string;
    location: string;
    date: Date;
    durationHour: string;
    startTime?: string | null;
    days: number;
    adults: number;
    children: number;
    unitPrice: number;
    totalPrice: number;
    status: BookingStatus;
    note?: string | null;
    rejectionReason?: string | null;
    cancellationReason?: string | null;
  };
}

const GST_TAX: number = 0;
const tax = GST_TAX || 0;
const discount: number = 0;

export function BookingDetails({ booking }: BookingDetailsProps) {
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900 capitalize">
            {booking.charterName}
          </h2>
          <p className="text-gray-600 capitalize">{booking.tripName}</p>
        </div>
      </div>

      {/* Status Message */}
      <div className="p-4 mb-6 rounded-lg bg-gray-50">
        <p className="text-sm text-gray-700">
          {getBookingStatusMessage(booking.status)}
        </p>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Guest Name</p>
              <p className="text-sm text-gray-600 capitalize">
                {booking.guestName}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Date</p>
              <p className="text-sm text-gray-600">
                {formatBookingDate(booking.date)} • {booking.days}{" "}
                {booking.days === 1 ? "day" : "days"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Duration</p>
              <p className="text-sm text-gray-600">
                {booking.durationHour}{" "}
                {Number(booking.durationHour) === 1 ? "hour" : "hours"}{" "}
                {booking.startTime &&
                  ` • Starting at ${convert24to12Hour(booking.startTime)}`}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Total Guests</p>
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
              <p className="font-mono text-sm text-gray-600">{booking.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      {booking.note && (
        <div className="p-4 mb-6 border border-blue-200 rounded-lg bg-blue-50">
          <p className="mb-1 text-sm font-medium text-blue-900">Your Note</p>
          <p className="text-sm text-blue-800">{booking.note}</p>
        </div>
      )}

      {/* Rejection Reason */}
      {booking.status === "REJECTED" && booking.rejectionReason && (
        <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
          <p className="mb-1 text-sm font-medium text-red-900">
            Rejection Reason
          </p>
          <p className="text-sm text-red-800">{booking.rejectionReason}</p>
        </div>
      )}

      {/* Cancellation Reason */}
      {booking.status === "CANCELLED" && booking.cancellationReason && (
        <div className="p-4 mb-6 border border-gray-200 rounded-lg bg-gray-50">
          <p className="mb-1 text-sm font-medium text-gray-900">
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
            <span className="text-gray-900">x {booking.days}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold border-t border-gray-200">
            <span className="text-gray-900">Trip Price</span>
            <span className="text-gray-900">
              {formatCurrency(booking.totalPrice)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Discount/Promo</span>
            <span className="text-gray-900">- {formatCurrency(discount)}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-900">
                {formatCurrency(tax * booking.totalPrice)}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-2 text-lg font-bold border-t border-gray-200">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">
              {formatCurrency(
                booking.totalPrice + booking.totalPrice * tax - discount
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
