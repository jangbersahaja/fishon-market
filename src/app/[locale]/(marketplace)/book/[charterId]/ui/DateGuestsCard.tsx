"use client";

import CalendarPicker from "@/components/shared/CalendarPicker";
import { calculateBlockedDates } from "@/lib/helpers/availability-helpers";
import { getMinimumBookableDate } from "@/lib/helpers/booking-helpers";
import { calculateDays } from "@/lib/helpers/date-range-helpers";
import type { CharterSchedule, UnavailabilityPeriod } from "@fishon/ui";
import { ChevronDown, Minus, Plus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

export default function DateGuestsCard({
  schedule,
  unavailability,
  charterId,
  charterType,
  date,
  onDateChange,
  days,
  onDaysChange,
  adults,
  onAdultsChange,
  childrenCount,
  onChildrenChange,
  maxGuests,
  blockedDatesSet,
  dateError,
}: {
  schedule?: CharterSchedule;
  unavailability?: UnavailabilityPeriod[];
  charterId?: string;
  charterType?: string;
  date: string;
  onDateChange: (v: string) => void;
  days: number;
  onDaysChange: (v: number) => void;
  adults: number;
  onAdultsChange: (v: number) => void;
  childrenCount: number;
  onChildrenChange: (v: number) => void;
  maxGuests?: number;
  blockedDatesSet?: Set<string>;
  dateError?: string;
}) {
  const t = useTranslations("booking.checkout.dateGuests");
  const [open, setOpen] = useState<null | "days" | "guests">(null);
  const [bookedDates, setBookedDates] = useState<string[]>([]);

  // Calculate minimum bookable date based on charter type
  const minBookableDate = useMemo(
    () => getMinimumBookableDate(charterType),
    [charterType]
  );

  // If blockedDatesSet is not provided, fetch and calculate it locally
  const shouldFetchLocally = !blockedDatesSet;

  // Fetch booked dates from API (only if not provided by parent)
  useEffect(() => {
    if (!shouldFetchLocally) return;

    async function fetchBookedDates() {
      if (!charterId) return;

      try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);

        // Format dates in local time (YYYY-MM-DD) to avoid UTC conversion issues
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
          setBookedDates(data.bookedDates || []);
        }
      } catch (error) {
        console.error("[DateGuestsCard] Failed to fetch booked dates:", error);
      }
    }

    fetchBookedDates();
  }, [charterId, shouldFetchLocally]);

  // Calculate all blocked dates (schedule + unavailability + bookings)
  // Only calculate if not provided by parent
  const localBlockedDates = useMemo(() => {
    if (!shouldFetchLocally) return new Set<string>();

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
  }, [schedule, unavailability, bookedDates, shouldFetchLocally]);

  // Use provided blockedDatesSet or fallback to local calculation
  const blockedDates = useMemo(() => {
    // Always ensure Set<string>
    if (blockedDatesSet) {
      return blockedDatesSet instanceof Set
        ? new Set(
            Array.from(blockedDatesSet).filter(
              (v): v is string => typeof v === "string"
            )
          )
        : new Set(
            (blockedDatesSet as any[]).filter(
              (v): v is string => typeof v === "string"
            )
          );
    }
    return localBlockedDates instanceof Set
      ? new Set(
          Array.from(localBlockedDates).filter(
            (v): v is string => typeof v === "string"
          )
        )
      : new Set(
          (localBlockedDates as any[]).filter(
            (v): v is string => typeof v === "string"
          )
        );
  }, [blockedDatesSet, localBlockedDates]);

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
    <section className="relative pb-5 border-b border-black/10">
      <h2 className="mb-4 text-base font-semibold sm:text-lg">{t("title")}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-9">
        {/* Date field (uses shared CalendarPicker with built-in dropdown) */}
        <div className="relative sm:col-span-5">
          <CalendarPicker
            value={date}
            initialDays={days}
            onChange={(v) => {
              onDateChange(v);
              // Reset to single day when selecting in single mode
              if (days > 1) onDaysChange(1);
            }}
            onRangeChange={(range) => {
              // Handle range selection
              const calculatedDays = calculateDays(
                range.startDate,
                range.endDate
              );
              onDateChange(range.startDate);
              onDaysChange(calculatedDays);
            }}
            minDate={minBookableDate}
            enableModeToggle={true}
            mode="single"
            blockedDates={blockedDates}
            buttonClassName={
              dateError
                ? "border-red-500 hover:border-red-600"
                : "hover:border-gray-400 bg-slate-50"
            }
          />
          {dateError && (
            <p className="mt-1 text-xs text-red-500">{dateError}</p>
          )}
          {!dateError && days > 1 && (
            <p className="mt-1 text-[10px] text-gray-500">
              {t("consecutiveDays", { days })}
            </p>
          )}
          {!dateError && (
            <p className="mt-1 text-[10px] text-gray-600">
              {charterType?.toUpperCase() === "OFFSHORE"
                ? t("offshoreNotice")
                : t("standardNotice")}
            </p>
          )}
        </div>

        {/* Days field */}
        <div className="relative hidden sm:col-span-2">
          <button
            type="button"
            onClick={() => setOpen(open === "days" ? null : "days")}
            className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg hover:border-gray-400"
            aria-haspopup="dialog"
            aria-expanded={open === "days"}
          >
            <span className="text-xs font-medium text-gray-700">
              {t("days")}
            </span>
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
            className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-slate-50 hover:border-gray-400"
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
                  <span className="text-xs text-gray-600">{t("adults")}</span>
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
                  <span className="text-xs text-gray-600">{t("children")}</span>
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
                  {t("maxGuests", { max: maxGuests })}
                </p>
              )}
              {overMax && (
                <p className="mt-1 text-[11px] text-red-600">
                  {t("exceededCapacity")}
                </p>
              )}
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="px-3 py-1.5 text-sm font-medium text-white rounded-md bg-[#ec2227]"
                >
                  {t("done")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
