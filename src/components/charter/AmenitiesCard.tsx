"use client";

import { AMENITIES_OPTIONS } from "@/data/amenities";
import {
  Apple,
  Check,
  Coffee,
  CupSoda,
  Fish,
  Package,
  ShieldCheck,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

export interface AmenitiesCardProps {
  /**
   * List of included amenities (case-insensitive match to AMENITIES_OPTIONS).
   */
  includes: string[];
  /**
   * Optional: custom className for the card container.
   */
  className?: string;
  /**
   * Optional: locale for label display ("en" or "my").
   */
  locale?: string;
}

function getAmenityIcon(label: string) {
  const l = label.toLowerCase();
  const iconClass = "w-4 h-4";
  if (l.includes("live bait")) return <Fish className={iconClass} />;
  if (l.includes("lures")) return <Package className={iconClass} />;
  if (l.includes("rod") || l.includes("reel"))
    return <Wrench className={iconClass} />;
  if (l.includes("terminal tackle")) return <Wrench className={iconClass} />;
  if (l.includes("snack")) return <Apple className={iconClass} />;
  if (l.includes("drinks")) return <CupSoda className={iconClass} />;
  if (l.includes("meals")) return <UtensilsCrossed className={iconClass} />;
  if (l.includes("life jacket")) return <ShieldCheck className={iconClass} />;
  return <Coffee className={iconClass} />;
}

/**
 * AmenitiesCard
 * Displays a list of included amenities as icons and labels.
 */
export const AmenitiesCard = React.memo(function AmenitiesCard({
  includes,
  className,
  locale = "en",
}: AmenitiesCardProps) {
  const t = useTranslations("charter.amenities");

  const charterIncludes = Array.isArray(includes)
    ? includes.map((a: string) => a.toLowerCase())
    : [];

  // Match amenities by label (case-insensitive)
  const included = AMENITIES_OPTIONS.filter((amenity) =>
    charterIncludes.some(
      (inc) =>
        amenity.label.toLowerCase().includes(inc) ||
        inc.includes(amenity.label.toLowerCase())
    )
  );

  if (included.length === 0) return null;

  return (
    <section
      className={"rounded-2xl bg-white p-5 shadow-lg " + (className || "")}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{t("title")}</h3>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-[#ec2227] text-xs font-medium">
          <Check className="w-3 h-3" />
          {t("included", { count: included.length })}
        </span>
      </div>

      <div className="mt-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {included.map((amenity) => {
            const displayLabel =
              locale === "my" ? amenity.labelMy : amenity.label;
            return (
              <div
                key={`inc-${amenity.key}`}
                className="flex items-center gap-3 py-2"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 text-[#ec2227]">
                  {getAmenityIcon(amenity.label)}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {displayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

// For backward compatibility with default import
export default AmenitiesCard;
