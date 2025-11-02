import { convert24to12Hour } from "@/lib/helpers/booking-helpers";
import React from "react";
import { TripSpeciesSection } from "./TripSpeciesSection";
import { TripTechniquesSection } from "./TripTechniquesSection";

interface TripCardProps {
  id?: string;
  name: string;
  price: number;
  duration: string;
  description?: string;
  species: string[];
  techniques: string[];
  maxAnglers?: number;
  startTimes?: string[];
  showSpecies?: boolean;
  showTechniques?: boolean;
}

export const TripCard: React.FC<TripCardProps> = ({
  id,
  name,
  price,
  duration,
  description,
  species,
  techniques,
  maxAnglers,
  startTimes,
  showSpecies = true,
  showTechniques = true,
}) => {
  return (
    <div
      id={id}
      className="mb-4 overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl scroll-mt-6"
    >
      <div className="flex flex-col gap-3 p-4">
        {/* Header row: name, price, duration */}
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900">{name}</h3>
          </div>
          <div className="flex items-center gap-3 md:ml-4">
            <span className="text-base font-semibold text-primary whitespace-nowrap">
              RM {price}/Day
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="mt-0.5 text-sm text-gray-600">
            {duration}
            {maxAnglers && ` • Up to ${maxAnglers} anglers`}
          </p>
        </div>
        {/* Start Times */}
        {startTimes && startTimes.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Start Times:</span>
            <div className="flex flex-wrap gap-1">
              {startTimes.map((time) => (
                <span
                  key={time}
                  className="inline-flex items-center px-2 py-0.5 text-sm bg-gray-100 rounded"
                >
                  {convert24to12Hour(time)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="px-3 py-3 border border-gray-100 rounded-lg bg-gray-50">
            <span className="text-sm text-gray-700">{description}</span>
          </div>
        )}

        {/* Species & Techniques section */}
        {showTechniques && (
          <div className="px-3 py-3 border border-gray-100 rounded-lg bg-gray-50">
            <TripTechniquesSection techniques={techniques} />
          </div>
        )}
        {showSpecies && (
          <div className="px-3 py-3 border border-gray-100 rounded-lg bg-gray-50">
            <TripSpeciesSection species={species} />
          </div>
        )}
      </div>
    </div>
  );
};
