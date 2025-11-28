"use client";
import CalendarPicker from "@/components/shared/CalendarPicker";
import { trackEvent } from "@/lib/analytics-tracking";
import {
  calculateBlockedDates,
  calculatePartialAvailability,
  type PartialAvailability,
} from "@/lib/helpers/availability-helpers";
import {
  convert24to12Hour,
  getMinimumBookableDate,
} from "@/lib/helpers/booking-helpers";
import { calculateDays } from "@/lib/helpers/date-range-helpers";
import type { CharterSchedule, Trip, UnavailabilityPeriod } from "@fishon/ui";
import { AlertCircle, ArrowRight, Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

interface BookingWidgetProps {
  trips: Trip[];
  charterId: string;
  ownerId?: string;
  userId?: string;
  charterType?: string;
  personsMax?: number;
  childFriendly?: boolean;
  /** @deprecated Use schedule + unavailability instead */
  blockedDates?: Set<string>;
  schedule?: CharterSchedule;
  unavailability?: UnavailabilityPeriod[];
  className?: string;
  defaultPersons?: number;
}

/**
 * Check if a trip start time conflicts with unavailable time ranges
 */
function isTimeInConflict(
  tripStartTime: string,
  unavailableRanges: { startTime: string; endTime: string }[]
): boolean {
  const [tripHour, tripMin] = tripStartTime.split(":").map(Number);
  const tripMinutes = tripHour * 60 + tripMin;

  return unavailableRanges.some((range) => {
    const [startHour, startMin] = range.startTime.split(":").map(Number);
    const [endHour, endMin] = range.endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Check if trip start time falls within unavailable range
    return tripMinutes >= startMinutes && tripMinutes < endMinutes;
  });
}

function BookingWidget({
  trips,
  charterId,
  ownerId,
  userId,
  charterType,
  personsMax,
  childFriendly = true,
  blockedDates: legacyBlockedDates,
  schedule,
  unavailability,
  className = "",
  defaultPersons = 2,
}: BookingWidgetProps) {
  const locale = useLocale();
  const t = useTranslations("charter.bookingWidget");
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
  const [bookedDatesData, setBookedDatesData] = useState<{
    fullDayBlocks: string[];
    timeBasedBlocks: Array<{
      date: string;
      startTime: string;
      endTime: string;
      isFullDay: boolean;
    }>;
  } | null>(null);

  // Calculate minimum bookable date based on charter type
  const minBookableDate = useMemo(
    () => getMinimumBookableDate(charterType),
    [charterType]
  );

  // Fetch booked dates from API
  useEffect(() => {
    async function fetchBookedDates() {
      if (!charterId) return;

      try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);

        // Format dates in local time (YYYY-MM-DD)
        const formatLocalYMD = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        };

        const response = await fetch(
          `/api/charters/${charterId}/booked-dates?startDate=${formatLocalYMD(startDate)}&endDate=${formatLocalYMD(endDate)}`
        );

        if (response.ok) {
          const data = await response.json();
          console.log("[BookingWidget] Booked dates API response:", {
            fullDayBlocks: data.fullDayBlocks?.length || 0,
            timeBasedBlocks: data.timeBasedBlocks?.length || 0,
          });
          // Support both new format and legacy format
          if (data.fullDayBlocks) {
            setBookedDatesData({
              fullDayBlocks: data.fullDayBlocks,
              timeBasedBlocks: data.timeBasedBlocks || [],
            });
          } else if (data.bookedDates) {
            // Legacy format: convert to new structure
            setBookedDatesData({
              fullDayBlocks: data.bookedDates,
              timeBasedBlocks: [],
            });
          }
        }
      } catch (error) {
        console.error("[BookingWidget] Failed to fetch booked dates:", error);
      }
    }

    fetchBookedDates();
  }, [charterId]);

  // Calculate blocked dates (schedule + unavailability + bookings)
  const blockedDates = useMemo(() => {
    // If legacy blockedDates is provided and we have no schedule, use legacy
    if (legacyBlockedDates && legacyBlockedDates.size > 0 && !schedule) {
      return legacyBlockedDates;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    const blocked = calculateBlockedDates(
      schedule,
      unavailability,
      bookedDatesData,
      startDate,
      endDate
    );

    console.log("[BookingWidget] Blocked dates calculated:", {
      count: blocked.size,
      sample: Array.from(blocked).slice(0, 5),
    });

    return blocked;
  }, [schedule, unavailability, bookedDatesData, legacyBlockedDates]);

  // Calculate partial availability (time-based unavailability)
  const partialAvailability = useMemo(() => {
    if (!unavailability && !bookedDatesData)
      return new Map<string, PartialAvailability>();

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    const partial = calculatePartialAvailability(
      unavailability,
      bookedDatesData,
      startDate,
      endDate
    );

    console.log("[BookingWidget] Partial availability calculated:", {
      count: partial.size,
      dates: Array.from(partial.keys()).slice(0, 5),
    });

    return partial;
  }, [unavailability, bookedDatesData]);

  // Calculate trip availability based on time-based unavailability
  const tripsWithAvailability = useMemo(() => {
    const selectedDatePartial =
      date && partialAvailability ? partialAvailability.get(date) : undefined;

    // Check if date is fully blocked
    const isDateFullyBlocked = blockedDates.has(date);

    if (isDateFullyBlocked) {
      // All trips unavailable on fully blocked date
      return trips.map((trip) => ({
        trip,
        isAvailable: false,
        availableStartTimes: [],
        reason: "date_blocked" as const,
      }));
    }

    if (!selectedDatePartial) {
      // No time-based unavailability - all trips available
      return trips.map((trip) => ({
        trip,
        isAvailable: true,
        availableStartTimes: trip.startTimes || [],
        reason: null,
      }));
    }

    // Check each trip against unavailable time ranges
    return trips.map((trip) => {
      // If trip has no start times defined, assume available
      if (!trip.startTimes || trip.startTimes.length === 0) {
        return {
          trip,
          isAvailable: true,
          availableStartTimes: [],
          reason: null,
        };
      }

      // Filter available start times
      const availableStartTimes = trip.startTimes.filter(
        (startTime) =>
          !isTimeInConflict(
            startTime,
            selectedDatePartial.unavailableTimeRanges
          )
      );

      // Trip is available if at least one start time is available
      const isAvailable = availableStartTimes.length > 0;
      const reason = isAvailable ? null : ("time_conflict" as const);

      return { trip, isAvailable, availableStartTimes, reason };
    });
  }, [trips, date, partialAvailability, blockedDates]);

  // Auto-select first available trip when availability changes
  useEffect(() => {
    const currentTripAvailable =
      tripsWithAvailability[selectedTripIndex]?.isAvailable;
    if (!currentTripAvailable) {
      // Find first available trip
      const firstAvailableIndex = tripsWithAvailability.findIndex(
        (t) => t.isAvailable
      );
      if (
        firstAvailableIndex !== -1 &&
        firstAvailableIndex !== selectedTripIndex
      ) {
        setSelectedTripIndex(firstAvailableIndex);
      }
    }
  }, [tripsWithAvailability, selectedTripIndex]);

  const totalGuests = adults + childrenCount;
  const overMax = personsMax !== undefined && totalGuests > (personsMax ?? 0);

  // Check if selected date is blocked
  const isSelectedDateBlocked = blockedDates.has(date);

  // Check if any trips are available on selected date
  const hasAvailableTrips = tripsWithAvailability.some((t) => t.isAvailable);

  const containerClassName = ["rounded-2xl bg-white p-5 shadow-lg", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      <div className="">
        <label className="block text-xs font-medium text-gray-700">
          {days > 1 ? t("dateRange") : t("date")}
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
            partialAvailability={partialAvailability}
            buttonClassName={`h-10 rounded-lg border px-3 text-sm ${
              isSelectedDateBlocked
                ? "border-red-300 bg-red-50"
                : "border-gray-300"
            }`}
            enableModeToggle={true}
            mode="single"
          />
        </div>
        {isSelectedDateBlocked && (
          <p className="flex items-center gap-1 mt-1 text-xs text-red-600">
            <AlertCircle className="w-3 h-3" />
            {t("dateNotAvailable")}
          </p>
        )}
        {!isSelectedDateBlocked && days > 1 && (
          <p className="mt-1 text-xs text-gray-500">
            {t("daysSelected", { count: days })}
          </p>
        )}
        {!isSelectedDateBlocked && (
          <p className="mt-1 text-[10px] text-gray-600">
            {charterType?.toUpperCase() === "OFFSHORE"
              ? t("offshoreNotice")
              : t("standardNotice")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 mt-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-700">
            {t("adults")}
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
              {t("children")}
            </label>
            {!childFriendly && (
              <span className="text-[10px] text-gray-500">
                {t("notChildFriendly")}
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
            {t("maxGuests", { count: personsMax })}
          </p>
        )}
        {overMax && (
          <p className="-mt-1 text-[11px] text-red-600">
            {t("exceededCapacity")}
          </p>
        )}
      </div>

      {/* Trip Selection Cards */}
      <div className="mt-4">
        <label className="block mb-2 text-xs font-medium text-gray-700">
          {t("selectTrip")}
        </label>
        <div className="flex flex-col gap-2">
          {tripsWithAvailability.map(
            ({ trip, isAvailable, availableStartTimes }, idx) => {
              const isSelected = selectedTripIndex === idx;
              // Calculate display price with commission (10% capped at RM100)
              const basePrice = trip.priceOverride ?? trip.price;
              const commission = Math.min(basePrice * 0.1, 100);
              const displayPrice = basePrice + commission;
              const totalPrice = displayPrice * Math.max(1, days);

              // Check if this trip has limited availability (some times blocked)
              const hasPartialAvailability =
                isAvailable &&
                availableStartTimes.length > 0 &&
                availableStartTimes.length < (trip.startTimes?.length || 0);

              return (
                <div
                  key={trip.id || idx}
                  onClick={() => isAvailable && setSelectedTripIndex(idx)}
                  className={`
                  relative overflow-hidden rounded-xl border transition-all
                  ${
                    !isAvailable
                      ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                      : hasPartialAvailability
                        ? `cursor-pointer ${
                            isSelected
                              ? "border-orange-500 bg-orange-50/50"
                              : "border-orange-200 hover:border-orange-300"
                          }`
                        : `cursor-pointer ${
                            isSelected
                              ? "border-[#ec2227] bg-red-50/30"
                              : "border-black/10 hover:border-black/20"
                          }`
                  }
                `}
                >
                  {/* Unavailable badge */}
                  {!isAvailable && (
                    <div className="absolute top-2 right-2 bg-gray-500 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t("unavailable")}
                    </div>
                  )}
                  {/* Limited availability badge */}
                  {hasPartialAvailability && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t("limitedAvailability")}
                    </div>
                  )}

                  <div className="px-3 py-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-sm font-semibold ${!isAvailable ? "text-gray-500" : "text-gray-900"}`}
                        >
                          {trip.name}
                        </h4>
                        <p className="mt-0.5 text-xs text-gray-600">
                          {trip.duration}
                          {trip.maxAnglers &&
                            ` • ${t("upToAnglers", { count: trip.maxAnglers })}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-base font-bold ${!isAvailable ? "text-gray-400" : "text-[#ec2227]"}`}
                        >
                          RM{totalPrice.toFixed(2)}
                        </p>
                        {days > 1 && (
                          <p className="text-[10px] text-gray-500">
                            {t("forDays", {
                              count: days,
                              plural: days > 1 ? "s" : "",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      {/* Start Times - show available times for partial availability */}
                      {isAvailable &&
                      hasPartialAvailability &&
                      availableStartTimes.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-orange-600 font-medium">
                            {t("availableTimes")}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {availableStartTimes.map((time) => (
                              <span
                                key={time}
                                className="inline-flex items-center px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded"
                              >
                                {convert24to12Hour(time)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : trip.startTimes &&
                        trip.startTimes.length > 0 &&
                        isAvailable ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500">
                            {t("startTimes")}
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
                      ) : (
                        <div />
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
                        {t("seeDetails")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Reserve button */}
      <div className="mt-4">
        <button
          type="button"
          className="w-full rounded-xl bg-[#ec2227] px-4 py-2 text-sm font-semibold text-white hover:translate-y-px transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={
            !date ||
            adults < 1 ||
            overMax ||
            isSelectedDateBlocked ||
            !hasAvailableTrips
          }
          onClick={() => {
            // Track booking started
            trackEvent({
              eventType: "BOOKING_STARTED",
              charterId,
              ownerId,
              userId,
              metadata: {
                tripIndex: selectedTripIndex,
                tripName: trips[selectedTripIndex]?.name,
                date,
                days,
                adults,
                children: childrenCount,
              },
            });

            const params = new URLSearchParams();
            params.set("trip_index", String(selectedTripIndex));
            params.set("date", date);
            params.set("days", String(days));
            params.set("adults", String(adults));
            params.set("children", String(childrenCount));
            window.location.assign(
              `/${locale}/book/${charterId}?${params.toString()}`
            );
          }}
        >
          {isSelectedDateBlocked
            ? t("dateNotAvailable")
            : !hasAvailableTrips
              ? t("noTripsAvailable")
              : t("checkAvailability")}
          {!isSelectedDateBlocked && hasAvailableTrips && (
            <ArrowRight className="inline-block w-4 h-4 ml-2" />
          )}
        </button>
      </div>
    </div>
  );
}

export default BookingWidget;
