"use client";
import CalendarPicker from "@/components/shared/CalendarPicker";
import {
  convert24to12Hour,
  getMinimumBookableDate,
} from "@/lib/helpers/booking-helpers";
import { calculateDays } from "@/lib/helpers/date-range-helpers";
import type { Trip } from "@fishon/ui";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

interface BookingWidgetProps {
  trips: Trip[];
  charterId: string;
  charterType?: string;
  personsMax?: number;
  childFriendly?: boolean;
  blockedDates?: Set<string>;
  className?: string;
  defaultPersons?: number;
}

function BookingWidget({
  trips,
  charterId,
  charterType,
  personsMax,
  childFriendly = true,
  blockedDates = new Set(),
  className = "",
  defaultPersons = 2,
}: BookingWidgetProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Format in local time (Malaysia GMT+8), not UTC
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const defaultDateIso = `${year}-${month}-${day}`;

  const [date, setDate] = useState<string>(defaultDateIso);
  const [adults, setAdults] = useState<number>(Math.max(1, defaultPersons));
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [selectedTripIndex, setSelectedTripIndex] = useState<number>(0);
  const [days, setDays] = useState<number>(1);

  // Calculate minimum bookable date based on charter type
  const minBookableDate = useMemo(
    () => getMinimumBookableDate(charterType),
    [charterType]
  );

  const totalGuests = adults + childrenCount;
  const overMax = personsMax !== undefined && totalGuests > (personsMax ?? 0);

  const containerClassName = [
    "rounded-2xl border-2 border-[#ec2227] bg-white p-5 sm:p-6 shadow-lg",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      <div className="">
        <label className="block text-xs font-medium text-gray-700">
          Date{days > 1 ? " Range" : ""}
        </label>
        <div className="mt-1">
          <CalendarPicker
            value={date}
            initialDays={days}
            onChange={(newDate) => {
              setDate(newDate);
              // When switching to single day, reset to 1 day
              if (days > 1) {
                setDays(1);
              }
            }}
            onRangeChange={(range) => {
              // Calculate days from range
              const calculatedDays = calculateDays(
                range.startDate,
                range.endDate
              );
              setDate(range.startDate);
              setDays(calculatedDays);
            }}
            minDate={minBookableDate}
            blockedDates={blockedDates}
            buttonClassName="h-10 rounded-lg border border-gray-300 px-3 text-sm"
            enableModeToggle={true}
            mode="single"
          />
        </div>
        {days > 1 && (
          <p className="mt-1 text-xs text-gray-500">
            {days} consecutive days selected
          </p>
        )}
        <p className="mt-1 text-[10px] text-gray-600">
          {charterType?.toUpperCase() === "OFFSHORE"
            ? "Offshore trips require 36 hours advance booking"
            : "Bookings must be made 24 hours in advance"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 mt-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Adults
          </label>
          <div className="flex items-center justify-between h-10 px-3 mt-1 border border-gray-300 rounded-lg">
            <button
              type="button"
              className="text-sm leading-none border border-gray-300 rounded-full h-7 w-7 hover:bg-gray-50"
              onClick={() => setAdults((a) => Math.max(1, a - 1))}
              aria-label="Decrease adults"
            >
              −
            </button>
            <span className="min-w-[2ch] text-sm text-center">{adults}</span>
            <button
              type="button"
              className="text-sm leading-none border border-gray-300 rounded-full h-7 w-7 hover:bg-gray-50"
              onClick={() =>
                setAdults((a) =>
                  personsMax
                    ? Math.min((personsMax ?? 0) - childrenCount, a + 1)
                    : a + 1
                )
              }
              aria-label="Increase adults"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-gray-700">
              Children
            </label>
            {!childFriendly && (
              <span className="text-[10px] text-gray-500">
                Not child friendly
              </span>
            )}
          </div>
          <div className="flex items-center justify-between h-10 px-3 mt-1 border border-gray-300 rounded-lg">
            <button
              type="button"
              className="text-sm leading-none border border-gray-300 rounded-full h-7 w-7 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => setChildrenCount((c) => Math.max(0, c - 1))}
              aria-label="Decrease children"
              disabled={!childFriendly}
            >
              −
            </button>
            <span className="min-w-[2ch] text-sm text-center">
              {childrenCount}
            </span>
            <button
              type="button"
              className="text-sm leading-none border border-gray-300 rounded-full h-7 w-7 hover:bg-gray-50 disabled:opacity-50"
              onClick={() =>
                setChildrenCount((c) => {
                  const next = c + 1;
                  return personsMax
                    ? Math.min((personsMax ?? 0) - adults, next)
                    : next;
                })
              }
              aria-label="Increase children"
              disabled={!childFriendly}
            >
              +
            </button>
          </div>
        </div>

        {personsMax !== undefined && (
          <p className="-mt-1 text-[11px] text-gray-500">
            Max {personsMax} guests.
          </p>
        )}
        {overMax && (
          <p className="-mt-1 text-[11px] text-red-600">
            You’ve exceeded the maximum capacity.
          </p>
        )}
      </div>

      {/* Trip Selection Cards */}
      <div className="mt-4">
        <label className="block mb-2 text-xs font-medium text-gray-700">
          Select Trip
        </label>
        <div className="flex flex-col gap-2">
          {trips.map((trip, idx) => {
            const isSelected = selectedTripIndex === idx;
            const totalPrice = trip.price * Math.max(1, days);

            return (
              <div
                key={trip.id || idx}
                onClick={() => setSelectedTripIndex(idx)}
                className={`
                  relative overflow-hidden rounded-xl border transition-all cursor-pointer
                  ${
                    isSelected
                      ? "border-[#ec2227] bg-red-50/30"
                      : "border-black/10 hover:border-black/20"
                  }
                `}
              >
                <div className="px-3 py-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {trip.name}
                      </h4>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {trip.duration}
                        {trip.maxAnglers &&
                          ` • Up to ${trip.maxAnglers} anglers`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-[#ec2227]">
                        RM{totalPrice}
                      </p>
                      {days > 1 && (
                        <p className="text-[10px] text-gray-500">
                          for {days} day{days > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    {/* Start Times */}
                    {trip.startTimes && trip.startTimes.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500">
                          Start Times:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {trip.startTimes.map((time) => (
                            <span
                              key={time}
                              className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 rounded"
                            >
                              {convert24to12Hour(time)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* See Trip Details Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const tripElement = document.getElementById(
                          `trip-${idx}`
                        );
                        if (tripElement) {
                          tripElement.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }
                      }}
                      className="text-xs text-gray-700 hover:text-[#ec2227] font-medium underline transition-colors"
                    >
                      See Trip Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reserve button */}
      <div className="mt-4">
        <button
          type="button"
          className="w-full rounded-xl bg-[#ec2227] px-4 py-2 text-sm font-semibold text-white hover:translate-y-px transition disabled:opacity-50"
          disabled={!date || adults < 1 || overMax}
          onClick={() => {
            const params = new URLSearchParams();
            params.set("trip_index", String(selectedTripIndex));
            params.set("date", date);
            params.set("days", String(days));
            params.set("adults", String(adults));
            params.set("children", String(childrenCount));
            window.location.assign(`/book/${charterId}?${params.toString()}`);
          }}
        >
          Check Availability
          <ArrowRight className="inline-block w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}

export default BookingWidget;
