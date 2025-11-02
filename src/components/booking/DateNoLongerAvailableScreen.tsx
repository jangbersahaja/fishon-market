/**
 * DateNoLongerAvailableScreen Component
 *
 * Displays empathetic message when angler's selected date was booked by someone else
 * before they completed payment. Provides alternative dates and actions.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatBookingDate } from "@/lib/helpers/booking-helpers";
import { Bell, Calendar, Search, Users } from "lucide-react";
import Link from "next/link";

interface DateNoLongerAvailableScreenProps {
  booking: {
    id: string;
    date: Date;
    charter: {
      id: string;
      title: string;
      location?: string;
    };
  };
  /** Alternative available dates for this charter (optional) */
  alternativeDates?: Date[];
}

export function DateNoLongerAvailableScreen({
  booking,
  alternativeDates = [],
}: DateNoLongerAvailableScreenProps) {
  const hasAlternatives = alternativeDates.length > 0;

  return (
    <div className="container max-w-3xl px-4 py-12 mx-auto">
      {/* Icon + Heading */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 text-blue-600 bg-blue-100 rounded-full">
          <Users className="w-8 h-8" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Date No Longer Available
        </h1>
        <p className="text-lg text-gray-600">
          Another angler booked this date while you were checking out
        </p>
      </div>

      {/* Information Alert */}
      <div className="flex gap-3 p-4 mb-6 border border-blue-200 rounded-lg bg-blue-50">
        <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong className="font-semibold">
            {formatBookingDate(booking.date)}
          </strong>{" "}
          is now fully booked. This charter is popular and dates can fill up
          quickly! Check the calendar below for other available dates.
        </div>
      </div>

      {/* Charter Info Card */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div>
              <h3 className="mb-1 text-sm font-medium text-gray-500">
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
            <div className="pt-3 border-t">
              <p className="text-sm text-gray-600">
                The date you selected has been booked by another angler.
                Don&apos;t worry—you can browse alternative dates or get
                notified when this charter has new availability.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alternative Dates (if provided) */}
      {hasAlternatives && (
        <Card className="mb-8 border-green-200">
          <CardContent className="pt-6">
            <h3 className="mb-3 font-semibold text-gray-900">
              Alternative Available Dates
            </h3>
            <div className="space-y-2">
              {alternativeDates.slice(0, 5).map((altDate, idx) => (
                <Link
                  key={idx}
                  href={`/charters/${booking.charter.id}?date=${altDate.toISOString().split("T")[0]}`}
                  className="block p-3 transition-colors border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {formatBookingDate(altDate)}
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      Available
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            {alternativeDates.length > 5 && (
              <p className="mt-3 text-sm text-gray-500">
                + {alternativeDates.length - 5} more dates available
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col justify-center gap-4 mb-8 sm:flex-row">
        {/* Primary: View full calendar */}
        <Button asChild size="lg" className="flex-1 py-2 sm:flex-initial">
          <Link href={`/charters/${booking.charter.id}`}>
            <Calendar className="w-4 h-4 mr-2" />
            View Full Calendar
          </Link>
        </Button>

        {/* Secondary: Browse similar charters */}
        <Button
          asChild
          variant="outline"
          size="lg"
          className="flex-1 py-2 sm:flex-initial"
        >
          <Link href={`/charters?similar=${booking.charter.id}`}>
            <Search className="w-4 h-4 mr-2" />
            Similar Charters
          </Link>
        </Button>
      </div>

      {/* Waitlist Option */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="mb-1 font-semibold text-amber-900">
                Get Notified of Cancellations
              </h3>
              <p className="mb-4 text-sm text-amber-800">
                Join the waitlist for {formatBookingDate(booking.date)}.
                We&apos;ll notify you immediately if this date becomes available
                again due to cancellations.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-600 text-amber-900 hover:bg-amber-100"
              >
                <Bell className="w-4 h-4 mr-2" />
                Join Waitlist
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          Questions?{" "}
          <Link
            href="/contact?subject=date-unavailable"
            className="font-medium text-blue-600 underline hover:text-blue-700"
          >
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}
