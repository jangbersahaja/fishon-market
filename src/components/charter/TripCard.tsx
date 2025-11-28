"use client";

import PriceTag from "@/components/shared/PriceTag";
import { convert24to12Hour } from "@/lib/helpers/booking-helpers";
import { calculateDisplayPrice } from "@/lib/helpers/pricing-helpers";
import { Clock, Flame, Timer, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { TripSpeciesSection } from "./TripSpeciesSection";
import { TripTechniquesSection } from "./TripTechniquesSection";

interface TripCardProps {
  id?: string;
  name: string;
  price: number;
  priceOverride?: number; // Admin's active price override
  duration: string;
  description?: string;
  species: string[];
  techniques: string[];
  maxAnglers?: number;
  startTimes?: string[];
  showSpecies?: boolean;
  showTechniques?: boolean;
  isPopular?: boolean;
  onBookTrip?: () => void;
}

export const TripCard: React.FC<TripCardProps> = ({
  id,
  name,
  price,
  priceOverride,
  duration,
  description,
  species,
  techniques,
  maxAnglers,
  startTimes,
  showSpecies = true,
  showTechniques = true,
  isPopular = false,
  onBookTrip,
}) => {
  const t = useTranslations("charter.trip");
  const basePrice = priceOverride ?? price;
  const displayPrice = calculateDisplayPrice(basePrice);

  const handleBookTrip = () => {
    if (onBookTrip) {
      onBookTrip();
    } else {
      // Scroll to booking widget
      const bookingWidget = document.querySelector("[data-booking-widget]");
      if (bookingWidget) {
        bookingWidget.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <div
      id={id}
      className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl scroll-mt-6"
    >
      {/* Most Popular Badge */}
      {isPopular && (
        <div className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500">
          <Flame className="w-4 h-4" />
          {t("mostPopular")}
        </div>
      )}

      <div className="flex flex-col gap-3 p-4">
        {/* Header row: name and price */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-bold text-gray-900">{name}</h3>
          <PriceTag price={displayPrice} variant="per-day" size="md" />
        </div>

        {/* Description */}
        {description && (
          <div className="">
            <span className="text-sm text-gray-700">
              &quot;{description}&quot;
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="col-span-1 px-3 py-3 border border-gray-100 rounded-lg bg-gray-50">
            {/* Quick info row with icons */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" />
                <span>{duration}</span>
              </div>
              {maxAnglers && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  <span>{t("upToAnglers", { count: maxAnglers })}</span>
                </div>
              )}
            </div>

            {/* Start Times */}
            {startTimes && startTimes.length > 0 && (
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-gray-500">{t("startTimes")}</span>
                <div className="flex flex-wrap gap-1">
                  {startTimes.map((time) => (
                    <span
                      key={time}
                      className="inline-flex items-center px-2 py-0.5 text-sm bg-gray-100 rounded font-medium"
                    >
                      {convert24to12Hour(time)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {showTechniques && techniques.length > 0 && (
            <div className="px-3 py-3 border border-gray-100 rounded-lg bg-gray-50">
              <TripTechniquesSection techniques={techniques} />
            </div>
          )}
        </div>
        {/* Species & Techniques section */}

        {showSpecies && species.length > 0 && (
          <div className="px-3 py-3 border border-gray-100 rounded-lg bg-gray-50">
            <TripSpeciesSection species={species} />
          </div>
        )}

        {/* Book This Trip Button */}
        <button
          type="button"
          onClick={handleBookTrip}
          className="w-full py-3 mt-2 text-sm font-semibold text-white transition-colors rounded-lg bg-primary hover:bg-primary/90"
        >
          {t("bookThisTrip")} →
        </button>
      </div>
    </div>
  );
};
