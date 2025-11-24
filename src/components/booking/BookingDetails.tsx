"use client";

import {
  convert24to12Hour,
  formatBookingDate,
  formatCurrency,
} from "@/lib/helpers/booking-helpers";
import type {
  EmergencyContact,
  Participant,
  TimeSlot,
} from "@/lib/services/booking-display-service";
import type { BookingStatus } from "@/lib/services/booking-service";
import {
  AlertCircle,
  Calendar,
  Clock,
  FileText,
  Phone,
  User,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

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
    subtotal: number;
    totalPrice: number;
    platformFee?: number;
    serviceFee?: number;
    captainEarnings?: number;
    status: BookingStatus;
    note?: string | null;
    rejectionReason?: string | null;
    cancellationReason?: string | null;
    timeSlots?: TimeSlot[];
    participants?: Participant[];
    emergencyContact?: EmergencyContact;
  };
}

const GST_TAX: number = 0;
const tax = GST_TAX || 0;
const discount: number = 0;

export function BookingDetails({ booking }: BookingDetailsProps) {
  const t = useTranslations("booking.details");

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900 capitalize">
            {booking.charterName}
          </h2>
          <p className="text-gray-600">
            <span className="capitalize">{booking.tripName}</span> •{" "}
            {booking.durationHour}{" "}
            {Number(booking.durationHour) === 1 ? "hour" : "hours"}{" "}
            {booking.startTime &&
              ` • Starting at ${convert24to12Hour(booking.startTime)}`}
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">
        <div className="flex items-start gap-3">
          <User className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t("guestName")}
            </p>
            <p className="text-sm text-gray-600 capitalize">
              {booking.guestName}
            </p>
          </div>
        </div>

        {/* Booking ID */}
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t("bookingId")}
            </p>
            <p className="font-mono text-sm text-gray-600">{booking.id}</p>
          </div>
        </div>

        {/* Time Slots (new hybrid flow) or Date (legacy flow) */}
        {booking.timeSlots && booking.timeSlots.length > 0 ? (
          <div className="flex items-start col-span-2 gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium text-gray-900">
                {t("tripSchedule")} ({booking.timeSlots.length}{" "}
                {t("session", { count: booking.timeSlots.length })})
              </p>
              <div className="space-y-2">
                {booking.timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 text-sm text-gray-600 rounded bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">
                      {t("day", { number: slot.day })}:
                    </span>
                    <span>
                      {new Date(slot.date).toLocaleDateString("en-MY", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        timeZone: "Asia/Kuala_Lumpur",
                      })}
                    </span>
                    <span className="text-gray-400">•</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(slot.startDateTime).toLocaleTimeString(
                        "en-MY",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                          timeZone: "Asia/Kuala_Lumpur",
                        }
                      )}{" "}
                      -{" "}
                      {new Date(slot.endDateTime).toLocaleTimeString("en-MY", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: "Asia/Kuala_Lumpur",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Legacy: Simple date display */}
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t("date")}</p>
                <p className="text-sm text-gray-600">
                  {formatBookingDate(booking.date)} • {booking.days}{" "}
                  {t("day", { count: booking.days })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t("duration")}
                </p>
                <p className="text-sm text-gray-600">
                  {booking.durationHour}{" "}
                  {t("hour", { count: Number(booking.durationHour) })}{" "}
                  {booking.startTime &&
                    ` • ${t("startingAt")} ${convert24to12Hour(booking.startTime)}`}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t("totalGuests")}
            </p>
            <p className="text-sm text-gray-600">
              {booking.adults} {t("adult", { count: booking.adults })}
              {booking.children > 0 &&
                `, ${booking.children} ${t("child", {
                  count: booking.children,
                })}`}
            </p>
          </div>
        </div>

        {/* Participant List */}
        {booking.participants && booking.participants.length > 0 && (
          <div className="flex items-start col-span-2 gap-3">
            <Users className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium text-gray-900">
                {t("participants")}
              </p>
              <div className="space-y-1.5">
                {booking.participants.map((participant, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <span className="capitalize">{participant.name}</span>
                    {participant.phone && (
                      <>
                        <span className="text-gray-400">•</span>
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          <span className="font-mono text-xs">
                            {participant.phone}
                          </span>
                        </p>
                      </>
                    )}
                    {participant.isBooker && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                        {t("booker")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Emergency Contact */}
        {booking.emergencyContact && (
          <div className="flex items-start col-span-2 gap-3">
            <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {t("emergencyContact")}
              </p>
              <div className="flex gap-2 text-sm text-gray-600">
                <p className="capitalize">{booking.emergencyContact.name}</p>
                <span className="text-gray-400">•</span>
                <p className="text-sm text-gray-500 capitalize">
                  {booking.emergencyContact.relationship}
                </p>
                <span className="text-gray-400">•</span>
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="font-mono text-xs">
                    {booking.emergencyContact.phone}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Note */}
      {booking.note && (
        <div className="p-4 mb-6 border border-blue-200 rounded-lg bg-blue-50">
          <p className="mb-1 text-sm font-medium text-blue-900">
            {t("yourNote")}
          </p>
          <p className="text-sm text-blue-800">{booking.note}</p>
        </div>
      )}

      {/* Rejection Reason */}
      {booking.status === "REJECTED" && booking.rejectionReason && (
        <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
          <p className="mb-1 text-sm font-medium text-red-900">
            {t("rejectionReason")}
          </p>
          <p className="text-sm text-red-800">{booking.rejectionReason}</p>
        </div>
      )}

      {/* Cancellation Reason */}
      {booking.status === "CANCELLED" && booking.cancellationReason && (
        <div className="p-4 mb-6 border border-gray-200 rounded-lg bg-gray-50">
          <p className="mb-1 text-sm font-medium text-gray-900">
            {t("cancellationReason")}
          </p>
          <p className="text-sm text-gray-700">{booking.cancellationReason}</p>
        </div>
      )}

      {/* Pricing */}
      <div className="relative pt-6 border-t border-gray-200">
        {/* PAID Stamp */}
        {(booking.status === "PAID" || booking.status === "COMPLETED") && (
          <div className="absolute z-10 pointer-events-none top-15 right-20">
            <div className="relative">
              <div className="px-6 py-3 text-3xl font-black tracking-wider text-green-600 uppercase border-4 border-green-600 rounded-lg rotate-12 bg-white/90">
                {t("paid")}
              </div>
              <div className="absolute inset-0 px-6 py-3 text-3xl font-black tracking-wider uppercase border-4 rounded-lg text-green-600/30 border-green-600/30 rotate-12 blur-sm">
                {t("paid")}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {/* Trip Price Calculation */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t("tripPrice")}</span>
            <span className="text-gray-900">
              {formatCurrency(booking.unitPrice)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t("numberOfDays")}</span>
            <span className="text-gray-900">× {booking.days}</span>
          </div>
          <div className="flex justify-between pt-2 text-sm border-t border-gray-100">
            <span className="text-gray-600">{t("subtotal")}</span>
            <span className="text-gray-900">
              {formatCurrency(booking.subtotal)}
            </span>
          </div>

          {/* Discount */}
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t("discount")}</span>
              <span className="text-green-600">
                - {formatCurrency(discount)}
              </span>
            </div>
          )}

          {/* Platform Fee */}
          {booking.platformFee && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t("commission")}</span>
              <span className="text-gray-900">
                {formatCurrency(booking.platformFee)}
              </span>
            </div>
          )}

          {/* Service Fee (Payment Gateway) */}
          {booking.serviceFee && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t("serviceFee")}</span>
              <span className="text-gray-900">
                {formatCurrency(booking.serviceFee)}
              </span>
            </div>
          )}

          {/* Tax (if applicable) */}
          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t("tax")}</span>
              <span className="text-gray-900">
                {formatCurrency(tax * booking.totalPrice)}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between pt-3 text-lg font-bold border-t border-gray-200">
            <span className="text-gray-900">
              {booking.status === "PAID" || booking.status === "COMPLETED"
                ? t("totalPaid")
                : t("total")}
            </span>
            <span className="text-gray-900">
              {formatCurrency(booking.totalPrice)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
