"use client";

import type { PartialAvailability } from "@/lib/helpers/availability-helpers";
import { calculatePricing } from "@/lib/services/pricing-service";
import type { SpeciesItem } from "@fishon/ui";
import { SPECIES_BY_ID } from "@fishon/ui";
import { SpeciesPills } from "@fishon/ui/charter";
import { Check, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

interface Trip {
  id?: string;
  name: string;
  duration?: string;
  description?: string;
  price: number;
  priceOverride?: number; // Admin's active price override
  maxAnglers?: number;
  startTimes?: string[];
  targetSpecies?: string[];
  techniques?: string[];
}

interface TripSelectionCardProps {
  trips: Trip[];
  selectedIndex: number;
  days: number;
  selectedDate?: string; // YYYY-MM-DD format
  partialAvailability?: Map<string, PartialAvailability>;
  charterSpecies?: string[];
  charterTechniques?: string[];
  onTripSelect: (index: number) => void;
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

export default function TripSelectionCard({
  trips,
  selectedIndex,
  days,
  selectedDate,
  partialAvailability,
  charterSpecies = [],
  charterTechniques = [],
  onTripSelect,
}: TripSelectionCardProps) {
  const t = useTranslations("booking.checkout.tripSelection");

  // Calculate trip availability based on time-based unavailability
  const tripsWithAvailability = useMemo(() => {
    const selectedDatePartial =
      selectedDate && partialAvailability
        ? partialAvailability.get(selectedDate)
        : undefined;

    if (!selectedDatePartial) {
      // No time-based unavailability - all trips available
      return trips.map((trip) => ({
        trip,
        isAvailable: true,
        availableStartTimes: trip.startTimes || [],
      }));
    }

    // Check each trip against unavailable time ranges
    return trips.map((trip) => {
      // If trip has no start times defined, assume available
      if (!trip.startTimes || trip.startTimes.length === 0) {
        return { trip, isAvailable: true, availableStartTimes: [] };
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

      return { trip, isAvailable, availableStartTimes };
    });
  }, [trips, selectedDate, partialAvailability]);

  // Early return after all hooks
  if (!trips || trips.length === 0) return null;

  // Map species strings (id/english/local) to rich pill items with image + local name
  const mapSpeciesToPills = (list: string[]) =>
    list.map((nameOrId) => {
      // Try id match first (allow undefined at runtime)
      let found: SpeciesItem | undefined = (
        SPECIES_BY_ID as Record<string, SpeciesItem | undefined>
      )[nameOrId];
      if (!found) {
        const lower = nameOrId.toLowerCase();
        found = Object.values(SPECIES_BY_ID).find(
          (sp) =>
            sp.english_name.toLowerCase() === lower ||
            sp.local_name.toLowerCase() === lower
        );
      }
      if (!found) return { label: nameOrId };
      return {
        id: found.id,
        english: found.english_name,
        local: found.local_name,
        imageSrc: found.image,
      };
    });

  return (
    <section className="pb-5 border-b border-black/10">
      <h2 className="mb-3 text-base font-semibold sm:text-lg">{t("title")}</h2>

      <div className="space-y-3">
        {tripsWithAvailability.map(
          ({ trip, isAvailable, availableStartTimes }, index) => {
            const isSelected = index === selectedIndex;
            const totalPrice = calculatePricing({
              tripPrice: trip.priceOverride ?? trip.price,
              days,
            });

            const speciesToShow =
              trip.targetSpecies && trip.targetSpecies.length > 0
                ? trip.targetSpecies
                : charterSpecies;
            const techniquesToShow =
              trip.techniques && trip.techniques.length > 0
                ? trip.techniques
                : charterTechniques;

            // Determine availability status
            const hasPartialAvailability =
              isAvailable &&
              availableStartTimes.length > 0 &&
              availableStartTimes.length < (trip.startTimes?.length || 0);

            return (
              <div
                key={trip.name + index}
                className={`relative overflow-hidden rounded-lg ring  transition-all ${
                  !isAvailable
                    ? "bg-gray-50 ring-gray-200 opacity-60 cursor-not-allowed"
                    : hasPartialAvailability
                      ? `bg-orange-50 cursor-pointer ${
                          isSelected
                            ? "ring-orange-500 ring-2"
                            : "ring-orange-200 hover:ring-orange-400"
                        }`
                      : `bg-slate-50 cursor-pointer ${
                          isSelected
                            ? "ring-[#ec2227] ring-2"
                            : "ring-black/10 hover:ring-black/20"
                        }`
                }`}
                onClick={() => isAvailable && onTripSelect(index)}
              >
                <div className="p-3">
                  {/* Availability Badge */}
                  {!isAvailable && (
                    <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t("unavailable")}
                    </div>
                  )}
                  {hasPartialAvailability && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t("limitedAvailability")}
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold">{trip.name}</h3>
                      {trip.duration && (
                        <p className="text-xs text-gray-600">
                          {trip.duration}
                          {trip.maxAnglers &&
                            ` • ${t("upToAnglers", { count: trip.maxAnglers })}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#ec2227]">
                          RM{totalPrice.finalPrice}
                        </p>
                        {days > 1 && (
                          <p className="text-xs text-gray-500">
                            {t("forDays", { days })}
                          </p>
                        )}
                      </div>

                      {/* Selection indicator */}
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full border transition-all ${
                          isSelected
                            ? "bg-[#ec2227] border-[#ec2227]"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded details when selected */}
                  {isSelected && (
                    <div className="pt-3 mt-3 space-y-3 border-t border-black/10">
                      {trip.description && (
                        <p className="text-xs leading-relaxed text-gray-700">
                          {trip.description}
                        </p>
                      )}

                      {speciesToShow.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-xs font-semibold text-gray-600 uppercase">
                            {t("targetSpecies")}
                          </h4>
                          <SpeciesPills
                            items={mapSpeciesToPills(speciesToShow)}
                            size="sm"
                            stackedNames
                            showImage
                          />
                        </div>
                      )}

                      {techniquesToShow.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-xs font-semibold text-gray-600 uppercase">
                            {t("techniques")}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2">
                            {techniquesToShow.map((technique) => (
                              <span
                                key={technique}
                                className="inline-flex items-center px-3 py-1 text-xs font-medium bg-white border rounded-full shadow-sm border-neutral-200 text-slate-700"
                              >
                                {technique}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Available Start Times (for partial availability) */}
                      {hasPartialAvailability &&
                        availableStartTimes.length > 0 && (
                          <div>
                            <h4 className="mb-2 text-xs font-semibold text-orange-600 uppercase">
                              {t("availableTimes")}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2">
                              {availableStartTimes.map((time) => (
                                <span
                                  key={time}
                                  className="inline-flex items-center px-3 py-1 text-xs font-medium bg-orange-100 border border-orange-300 rounded-full text-orange-700"
                                >
                                  {time}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}
