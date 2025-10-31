"use client";
import CalendarPicker from "@/components/shared/CalendarPicker";
import type { Trip } from "@/data/mock/charter";
import { calculateBlockedDates } from "@/lib/helpers/availability-helpers";
import { calculateDays } from "@/lib/helpers/date-range-helpers";
import type { CharterSchedule, UnavailabilityPeriod } from "@fishon/ui";
import { useEffect, useMemo, useState } from "react";

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BookingWidget({
  trips,
  charterId,
  schedule,
  unavailability,
  defaultPersons = 2,
  personsMax,
  childFriendly = true,
  className = "",
}: {
  trips: Trip[];
  charterId: string;
  schedule?: CharterSchedule;
  unavailability?: UnavailabilityPeriod[];
  defaultPersons?: number;
  personsMax?: number;
  childFriendly?: boolean;
  className?: string;
}) {
  let initAdults = Math.max(1, defaultPersons);
  let initChildren = 0;
  if (typeof personsMax === "number" && personsMax > 0) {
    const total = initAdults + initChildren;
    if (total > personsMax) {
      const excess = total - personsMax;
      const reduceChildren = Math.min(initChildren, excess);
      initChildren -= reduceChildren;
      const remaining = excess - reduceChildren;
      initAdults = Math.max(1, initAdults - remaining);
      if (initAdults + initChildren > personsMax) {
        initAdults = Math.max(1, personsMax - initChildren);
      }
    }
  }
  const initDate = todayIso();
  const initDays = 1;

  const [adults, setAdults] = useState(initAdults);
  const [children, setChildren] = useState(initChildren);
  const [date, setDate] = useState<string>(initDate);
  const [days, setDays] = useState<number>(initDays);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // Fetch booked dates from API
  useEffect(() => {
    async function fetchBookedDates() {
      if (!charterId) return;

      setIsLoadingBookings(true);
      try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);

        const response = await fetch(
          `/api/charters/${charterId}/booked-dates?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );

        if (response.ok) {
          const data = await response.json();
          setBookedDates(data.bookedDates || []);
        }
      } catch (error) {
        console.error("[BookingWidget] Failed to fetch booked dates:", error);
      } finally {
        setIsLoadingBookings(false);
      }
    }

    fetchBookedDates();
  }, [charterId]);

  // Calculate all blocked dates (schedule + unavailability + bookings)
  const blockedDates = useMemo(() => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    return calculateBlockedDates(
      schedule,
      unavailability,
      bookedDates,
      startDate,
      endDate
    );
  }, [schedule, unavailability, bookedDates]);

  const totalGuests = adults + children;
  const overMax = personsMax !== undefined && totalGuests > (personsMax ?? 0);

  const containerClassName = [
    "rounded-2xl border border-black/10 bg-white p-5 sm:p-6 shadow-lg",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold sm:text-lg">
          Check availability
        </h3>
      </div>

      <div className="mt-4">
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
            disablePast={true}
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
                    ? Math.min((personsMax ?? 0) - children, a + 1)
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
              onClick={() => setChildren((c) => Math.max(0, c - 1))}
              aria-label="Decrease children"
              disabled={!childFriendly}
            >
              −
            </button>
            <span className="min-w-[2ch] text-sm text-center">{children}</span>
            <button
              type="button"
              className="text-sm leading-none border border-gray-300 rounded-full h-7 w-7 hover:bg-gray-50 disabled:opacity-50"
              onClick={() =>
                setChildren((c) => {
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

      <div className="mt-4 space-y-3">
        {trips.map((t, i) => (
          <div
            key={t.name + i}
            className="p-3 border rounded-xl border-black/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-gray-600">
                  {t.duration}
                  {t.maxAnglers ? ` • up to ${t.maxAnglers} anglers` : ""}
                </div>
                {t.startTimes && t.startTimes.length > 0 && (
                  <div className="mt-1 text-xs text-gray-600">
                    Starts: {t.startTimes.join(", ")}
                  </div>
                )}
                {t.description && (
                  <div className="mt-2 text-xs text-gray-700">
                    {t.description}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-[#ec2227]">
                  RM{t.price * days}
                </div>
                {days > 1 && (
                  <div className="text-[11px] text-gray-500">
                    total for {days} day{days > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-xl bg-[#ec2227] px-4 py-2 text-sm font-semibold text-white hover:translate-y-px transition disabled:opacity-50"
              disabled={overMax}
              onClick={() => {
                const params = new URLSearchParams();
                params.set("trip_index", String(i));
                params.set("date", date);
                params.set("days", String(days));
                params.set("adults", String(adults));
                params.set("children", String(children));
                window.location.assign(
                  `/book/${charterId}?${params.toString()}`
                );
              }}
            >
              Reserve Trip
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
