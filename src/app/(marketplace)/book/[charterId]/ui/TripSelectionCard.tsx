"use client";

import type { SpeciesItem } from "@fishon/ui";
import { SPECIES_BY_ID } from "@fishon/ui";
import { SpeciesPills } from "@fishon/ui/charter";
import { Check } from "lucide-react";
interface Trip {
  name: string;
  duration?: string;
  description?: string;
  price: number;
  maxAnglers?: number;
  startTimes?: string[];
  targetSpecies?: string[];
  techniques?: string[];
}

interface TripSelectionCardProps {
  trips: Trip[];
  selectedIndex: number;
  days: number;
  charterSpecies?: string[];
  charterTechniques?: string[];
  onTripSelect: (index: number) => void;
}

export default function TripSelectionCard({
  trips,
  selectedIndex,
  days,
  charterSpecies = [],
  charterTechniques = [],
  onTripSelect,
}: TripSelectionCardProps) {
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
      <h2 className="mb-4 text-base font-semibold sm:text-lg">Confirm Trips</h2>

      <div className="space-y-3">
        {trips.map((trip, index) => {
          const isSelected = index === selectedIndex;
          const totalPrice = trip.price * Math.max(1, days);

          const speciesToShow =
            trip.targetSpecies && trip.targetSpecies.length > 0
              ? trip.targetSpecies
              : charterSpecies;
          const techniquesToShow =
            trip.techniques && trip.techniques.length > 0
              ? trip.techniques
              : charterTechniques;

          return (
            <div
              key={trip.name + index}
              className={`relative overflow-hidden rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "border-[#ec2227] bg-red-50/30"
                  : "border-black/10 hover:border-black/20"
              }`}
              onClick={() => onTripSelect(index)}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold">{trip.name}</h3>
                    {trip.duration && (
                      <p className="mt-1 text-sm text-gray-600">
                        {trip.duration}
                        {trip.maxAnglers &&
                          ` • Up to ${trip.maxAnglers} anglers`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#ec2227]">
                        RM{totalPrice}
                      </p>
                      {days > 1 && (
                        <p className="text-xs text-gray-500">
                          for {days} day{days > 1 ? "s" : ""}
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
                  <div className="pt-4 mt-4 space-y-3 border-t border-black/10">
                    {trip.description && (
                      <p className="text-sm leading-relaxed text-gray-700">
                        {trip.description}
                      </p>
                    )}

                    {speciesToShow.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold text-gray-600 uppercase">
                          Target Species
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
                          Techniques
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
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
