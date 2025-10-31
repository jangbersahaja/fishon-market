"use client";

import CalendarPicker from "@/components/shared/CalendarPicker";
import { calculateBlockedDates } from "@/lib/helpers/availability-helpers";
import type { CharterSchedule, UnavailabilityPeriod } from "@fishon/ui";
import { ChevronDown, Minus, Plus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function DateGuestsCard({
  schedule,
  unavailability,
  charterId,
  date,
  onDateChange,
  days,
  onDaysChange,
  adults,
  onAdultsChange,
  childrenCount,
  onChildrenChange,
  maxGuests,
}: {
  schedule?: CharterSchedule;
  unavailability?: UnavailabilityPeriod[];
  charterId?: string;
  date: string;
  onDateChange: (v: string) => void;
  days: number;
  onDaysChange: (v: number) => void;
  adults: number;
  onAdultsChange: (v: number) => void;
  childrenCount: number;
  onChildrenChange: (v: number) => void;
  maxGuests?: number;
}) {
  const [open, setOpen] = useState<null | "days" | "guests">(null);
  const [bookedDates, setBookedDates] = useState<string[]>([]);

  // Fetch booked dates from API
  useEffect(() => {
    async function fetchBookedDates() {
      if (!charterId) return;

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
        console.error("[DateGuestsCard] Failed to fetch booked dates:", error);
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

  const totalGuests = adults + childrenCount;
  const overMax = typeof maxGuests === "number" && totalGuests > maxGuests;

  function clampAdults(next: number) {
    const max = maxGuests ?? Infinity;
    return Math.max(1, Math.min(next, max - childrenCount));
  }
  function clampChildren(next: number) {
    const max = maxGuests ?? Infinity;
    return Math.max(0, Math.min(next, max - adults));
  }

  return (
    <section className="relative p-5 bg-white border rounded-2xl border-black/10 sm:p-6">
      <h2 className="mb-4 text-base font-semibold sm:text-lg">
        Trip Date & Guests
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-9">
        {/* Date field (uses shared CalendarPicker with built-in dropdown) */}
        <div className="relative sm:col-span-3">
          <CalendarPicker
            value={date}
            onChange={onDateChange}
            blockedDates={blockedDates}
            buttonClassName="hover:border-gray-400"
          />
        </div>

        {/* Days field */}
        <div className="relative sm:col-span-2">
          <button
            type="button"
            onClick={() => setOpen(open === "days" ? null : "days")}
            className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg hover:border-gray-400"
            aria-haspopup="dialog"
            aria-expanded={open === "days"}
          >
            <span className="text-xs font-medium text-gray-700">Days</span>
            <span className="text-sm text-gray-900">{days}</span>
            <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
          </button>
          {open === "days" && (
            <div className="absolute z-10 w-full p-3 mt-2 bg-white border shadow-lg rounded-xl border-black/10">
              <div className="flex items-center justify-between h-10 px-3 border border-gray-300 rounded-lg">
                <button
                  type="button"
                  onClick={() => onDaysChange(Math.max(1, days - 1))}
                  className="text-sm leading-none border border-gray-300 rounded-full h-7 w-7 hover:bg-gray-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="min-w-[2ch] text-sm text-center">{days}</span>
                <button
                  type="button"
                  onClick={() => onDaysChange(days + 1)}
                  className="text-sm leading-none border border-gray-300 rounded-full h-7 w-7 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="px-3 py-1.5 text-sm font-medium text-white rounded-md bg-[#ec2227]"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Guests field */}
        <div className="relative sm:col-span-4">
          <button
            type="button"
            onClick={() => setOpen(open === "guests" ? null : "guests")}
            className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg hover:border-gray-400"
            aria-haspopup="dialog"
            aria-expanded={open === "guests"}
          >
            <span className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <Users className="w-4 h-4 text-gray-600" />
            </span>
            <span className="text-sm text-gray-900">
              {adults} adult{adults > 1 ? "s" : ""}
              {childrenCount > 0 &&
                `, ${childrenCount} child${childrenCount > 1 ? "ren" : ""}`}
            </span>
            <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
          </button>
          {open === "guests" && (
            <div className="absolute z-10 w-full p-3 mt-2 bg-white border shadow-lg rounded-xl border-black/10">
              <div className="flex items-center justify-between gap-4">
                {/* Adults */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Adults</span>
                  <button
                    type="button"
                    onClick={() => onAdultsChange(clampAdults(adults - 1))}
                    className="flex items-center justify-center w-5 h-5 text-sm leading-none border border-gray-300 rounded-full hover:bg-gray-50"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="min-w-[2ch] text-sm text-center">
                    {adults}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdultsChange(clampAdults(adults + 1))}
                    className="flex items-center justify-center w-5 h-5 text-sm leading-none border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50"
                    disabled={
                      typeof maxGuests === "number" &&
                      adults + childrenCount >= maxGuests
                    }
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Children */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Children</span>
                  <button
                    type="button"
                    onClick={() =>
                      onChildrenChange(clampChildren(childrenCount - 1))
                    }
                    className="flex items-center justify-center w-5 h-5 text-sm leading-none border border-gray-300 rounded-full hover:bg-gray-50"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="min-w-[2ch] text-sm text-center">
                    {childrenCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChildrenChange(clampChildren(childrenCount + 1))
                    }
                    className="flex items-center justify-center w-5 h-5 text-sm leading-none border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50"
                    disabled={
                      typeof maxGuests === "number" &&
                      adults + childrenCount >= maxGuests
                    }
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {typeof maxGuests === "number" && (
                <p className="mt-2 text-[11px] text-gray-500">
                  Max {maxGuests} guests.
                </p>
              )}
              {overMax && (
                <p className="mt-1 text-[11px] text-red-600">
                  You’ve exceeded the maximum capacity.
                </p>
              )}
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="px-3 py-1.5 text-sm font-medium text-white rounded-md bg-[#ec2227]"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
